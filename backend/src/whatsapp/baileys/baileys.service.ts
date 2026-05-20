import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { EventsService } from '../../events/events.service';
import { WhatsAppProcessorService } from '../whatsapp-processor.service';
import { NormalisedWhatsAppMessage } from '../whatsapp.types';
import * as QRCode from 'qrcode';

interface BaileysSocket {
  logout: () => Promise<void>;
  sendMessage: (jid: string, content: { text: string }) => Promise<unknown>;
  end: (error?: Error) => void;
}

@Injectable()
export class BaileysService {
  private readonly logger = new Logger(BaileysService.name);
  private sessions = new Map<
    string,
    { socket: BaileysSocket; qr?: string; status: string }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
    private readonly processor: WhatsAppProcessorService,
  ) {}

  async initSession(accountId: string): Promise<void> {
    const account = await this.prisma.whatsAppAccount.findUnique({
      where: { id: accountId },
      select: { id: true, tenant_id: true, baileys_session_data: true },
    });
    if (!account) throw new Error('WhatsApp account not found');

    // Dynamic import to avoid breaking build if optional dep missing
    let makeWASocket:
      | ((config: Record<string, unknown>) => Promise<BaileysSocket>)
      | undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const baileys = require('@whiskeysockets/baileys') as {
        default?: (config: Record<string, unknown>) => BaileysSocket;
        makeWASocket?: (config: Record<string, unknown>) => BaileysSocket;
      };
      const fn = baileys.default || baileys.makeWASocket;
      if (typeof fn === 'function') {
        makeWASocket = fn as unknown as (
          config: Record<string, unknown>,
        ) => Promise<BaileysSocket>;
      }
    } catch {
      this.logger.warn(
        'Baileys package not available — WhatsApp QR session disabled',
      );
      return;
    }

    if (!makeWASocket) {
      this.logger.warn('makeWASocket not found in Baileys package');
      return;
    }

    this.sessions.set(accountId, {
      socket: null as unknown as BaileysSocket,
      status: 'connecting',
    });

    try {
      const socket = await makeWASocket({
        printQRInTerminal: false,
        auth: account.baileys_session_data || undefined,
      });

      const sessionEntry = {
        socket,
        qr: undefined as string | undefined,
        status: 'connecting',
      };
      this.sessions.set(accountId, sessionEntry);

      // Handle connection updates via event listeners
      const eventEmitter = socket as unknown as {
        ev?: {
          on: (event: string, handler: (...args: unknown[]) => void) => void;
        };
      };

      if (eventEmitter.ev) {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        eventEmitter.ev.on('connection.update', async (update: unknown) => {
          const u = update as {
            qr?: string;
            connection?: string;
            lastDisconnect?: unknown;
          };
          if (u.qr) {
            sessionEntry.qr = u.qr;
            const qrBase64 = await QRCode.toDataURL(u.qr);
            this.eventsService.emitToTenant(account.tenant_id, 'whatsapp.qr', {
              accountId,
              qr: qrBase64,
            });
          }
          if (u.connection === 'open') {
            sessionEntry.status = 'connected';
            await this.prisma.whatsAppAccount.update({
              where: { id: accountId },
              data: { is_active: true, last_connected_at: new Date() },
            });
            this.eventsService.emitToTenant(
              account.tenant_id,
              'whatsapp.connected',
              { accountId },
            );
          }
          if (u.connection === 'close') {
            sessionEntry.status = 'disconnected';
            this.eventsService.emitToTenant(
              account.tenant_id,
              'whatsapp.disconnected',
              { accountId },
            );
          }
        });

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        eventEmitter.ev.on('creds.update', async (creds: unknown) => {
          await this.prisma.whatsAppAccount.update({
            where: { id: accountId },
            data: { baileys_session_data: creds as Prisma.InputJsonValue },
          });
        });

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        eventEmitter.ev.on('messages.upsert', async (upsert: unknown) => {
          const u = upsert as { messages?: unknown[]; type?: string };
          if (u.type !== 'notify') return;
          for (const msg of u.messages || []) {
            await this.onMessage(accountId, msg, account.tenant_id);
          }
        });
      }
    } catch (err) {
      this.logger.error(`Baileys initSession error: ${(err as Error).message}`);
      this.sessions.delete(accountId);
      throw err;
    }
  }

  async onMessage(
    accountId: string,
    msg: unknown,
    tenantId: string,
  ): Promise<void> {
    const m = msg as {
      key?: { id?: string; remoteJid?: string; fromMe?: boolean };
      message?: {
        conversation?: string;
        extendedTextMessage?: { text?: string };
      };
    };

    const body =
      m.message?.conversation || m.message?.extendedTextMessage?.text || '';

    if (!body || m.key?.fromMe) return;

    const normalised: NormalisedWhatsAppMessage = {
      accountId,
      tenantId,
      externalId: m.key?.id,
      fromNumber: (m.key?.remoteJid || '').replace('@s.whatsapp.net', ''),
      body,
      direction: 'inbound',
      timestamp: new Date().toISOString(),
      rawPayload: msg,
    };

    await this.processor.process(normalised);
  }

  async sendMessage(
    accountId: string,
    to: string,
    body: string,
  ): Promise<void> {
    const session = this.sessions.get(accountId);
    if (!session?.socket)
      throw new Error('No active session for account ' + accountId);
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
    await session.socket.sendMessage(jid, { text: body });
  }

  getQR(accountId: string): string | null {
    return this.sessions.get(accountId)?.qr || null;
  }

  getStatus(accountId: string): string {
    return this.sessions.get(accountId)?.status || 'disconnected';
  }

  async disconnectSession(accountId: string): Promise<void> {
    const session = this.sessions.get(accountId);
    if (session?.socket) {
      try {
        await session.socket.logout();
      } catch {
        // ignore
      }
    }
    this.sessions.delete(accountId);
    await this.prisma.whatsAppAccount.update({
      where: { id: accountId },
      data: { is_active: false, baileys_session_data: undefined },
    });
  }
}
