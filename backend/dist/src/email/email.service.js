"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const tokenCrypto_1 = require("../utils/tokenCrypto");
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const prisma_service_1 = require("../prisma.service");
let EmailService = EmailService_1 = class EmailService {
    prisma;
    logger = new common_1.Logger(EmailService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    buildMimePart(headers, body) {
        const headerLines = Object.entries(headers).map(([key, value]) => `${key}: ${value}`);
        return [...headerLines, '', body].join('\r\n');
    }
    encodeMimeBase64(value) {
        const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
        return buffer
            .toString('base64')
            .replace(/(.{76})/g, '$1\r\n')
            .replace(/\r\n$/g, '');
    }
    buildRawMimeMessage(data) {
        const toHeader = data.to.join(', ');
        const ccHeader = data.cc && data.cc.length ? data.cc.join(', ') : undefined;
        if (!data.attachments || data.attachments.length === 0) {
            return this.buildMimePart({
                From: data.from,
                To: toHeader,
                ...(ccHeader ? { Cc: ccHeader } : {}),
                Subject: data.subject,
                'MIME-Version': '1.0',
                'Content-Type': 'text/plain; charset=UTF-8',
            }, data.body);
        }
        const boundary = `quotebot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
        const parts = [
            `From: ${data.from}`,
            `To: ${toHeader}`,
            ...(ccHeader ? [`Cc: ${ccHeader}`] : []),
            `Subject: ${data.subject}`,
            'MIME-Version: 1.0',
            `Content-Type: multipart/mixed; boundary="${boundary}"`,
            '',
            `--${boundary}`,
            this.buildMimePart({
                'Content-Type': 'text/plain; charset=UTF-8',
                'Content-Transfer-Encoding': '7bit',
            }, data.body),
        ];
        for (const attachment of data.attachments) {
            parts.push(`--${boundary}`, this.buildMimePart({
                'Content-Type': `${attachment.contentType || 'application/octet-stream'}; name="${attachment.filename}"`,
                'Content-Disposition': `attachment; filename="${attachment.filename}"`,
                'Content-Transfer-Encoding': 'base64',
            }, this.encodeMimeBase64(attachment.content)));
        }
        parts.push(`--${boundary}--`, '');
        return parts.join('\r\n');
    }
    async getOrCreateInboxPlaceholderClient(tenantId) {
        const placeholderEmail = `inbox-unqualified+${tenantId}@quotebot.local`;
        const existing = await this.prisma.client.findFirst({
            where: {
                tenant_id: tenantId,
                email: placeholderEmail,
            },
        });
        if (existing) {
            return existing;
        }
        return this.prisma.client.create({
            data: {
                tenant_id: tenantId,
                name: 'Inbox Unqualified Sender',
                email: placeholderEmail,
                type: 'B2B',
                tier: 'regular',
            },
        });
    }
    parseReceivedAt(receivedAt) {
        if (typeof receivedAt !== 'string' || !receivedAt.trim()) {
            return null;
        }
        const parsed = new Date(receivedAt);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    getSyncStatusFilePath(tenantId) {
        const suffix = tenantId ? `-${tenantId}` : '';
        return (process.env.GMAIL_SYNC_STATUS_FILE ||
            path.resolve(process.cwd(), '.runlogs', `gmail-sync-status${suffix}.json`));
    }
    getGmailSyncStatus(tenantId) {
        const statusFile = this.getSyncStatusFilePath(tenantId);
        try {
            if (!fs.existsSync(statusFile)) {
                return {
                    status: 'idle',
                    startedAt: null,
                    endedAt: null,
                    lastRunAt: null,
                    accountsTotal: 0,
                    accountsProcessed: 0,
                    totalMessages: 0,
                    processedMessages: 0,
                    synced: 0,
                    duplicates: 0,
                    failed: 0,
                    currentAccountId: null,
                    error: null,
                };
            }
            const raw = fs.readFileSync(statusFile, 'utf8');
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') {
                throw new Error('Invalid sync status payload');
            }
            return parsed;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                status: 'failed',
                error: `Could not read sync status: ${message}`,
            };
        }
    }
    triggerImmediateGmailSync(tenantId) {
        const currentStatus = this.getGmailSyncStatus(tenantId);
        if (currentStatus.status === 'running') {
            return {
                started: false,
                reason: 'Sync already in progress',
                status: currentStatus,
            };
        }
        const syncScriptPath = path.resolve(process.cwd(), 'scripts', 'sync-gmail.js');
        const statusFile = this.getSyncStatusFilePath(tenantId);
        const child = (0, child_process_1.spawn)('node', [syncScriptPath], {
            cwd: process.cwd(),
            detached: true,
            stdio: 'ignore',
            env: {
                ...process.env,
                SYNC_TENANT_ID: tenantId,
                GMAIL_SYNC_STATUS_FILE: statusFile,
            },
        });
        child.unref();
        return {
            started: true,
            reason: 'Sync started',
        };
    }
    async clearInboxData(tenantId) {
        const [messagesBefore, conversationsBefore] = await Promise.all([
            this.prisma.message.count({ where: { tenant_id: tenantId } }),
            this.prisma.conversation.count({ where: { tenant_id: tenantId } }),
        ]);
        await this.prisma.message.deleteMany({ where: { tenant_id: tenantId } });
        await this.prisma.conversation.deleteMany({
            where: { tenant_id: tenantId },
        });
        const [messagesAfter, conversationsAfter] = await Promise.all([
            this.prisma.message.count({ where: { tenant_id: tenantId } }),
            this.prisma.conversation.count({ where: { tenant_id: tenantId } }),
        ]);
        return {
            cleared: true,
            tenantId,
            before: {
                messages: messagesBefore,
                conversations: conversationsBefore,
            },
            after: {
                messages: messagesAfter,
                conversations: conversationsAfter,
            },
        };
    }
    readCredentials(credentials) {
        if (!credentials || typeof credentials !== 'object') {
            return null;
        }
        return credentials;
    }
    async getActiveEmailAccounts(tenantId) {
        const accounts = await this.prisma.emailAccount.findMany({
            where: {
                tenant_id: tenantId,
                is_active: true,
            },
            select: {
                id: true,
                tenant_id: true,
                credentials: true,
            },
            orderBy: [{ created_at: 'asc' }],
        });
        return accounts.map((account) => {
            const credentials = this.readCredentials(account.credentials);
            const accessToken = credentials?.access_token;
            const expiresAt = credentials?.expires_at;
            return {
                id: account.id,
                access_token: typeof accessToken === 'string' && accessToken.trim().length > 0
                    ? accessToken
                    : undefined,
                expires_at: typeof expiresAt === 'string' ? expiresAt : null,
            };
        });
    }
    async refreshEmailAccountAccessToken(accountId, tenantId) {
        const account = await this.prisma.emailAccount.findFirst({
            where: {
                id: accountId,
                is_active: true,
                tenant_id: tenantId,
            },
            select: {
                id: true,
                provider: true,
                tenant_id: true,
                user_id: true,
                credentials: true,
            },
        });
        if (!account) {
            throw new common_1.BadRequestException(`Email account ${accountId} not found`);
        }
        if (account.provider !== 'gmail') {
            throw new common_1.BadRequestException(`Token refresh is currently supported only for gmail accounts`);
        }
        const credentials = this.readCredentials(account.credentials);
        const storedRefresh = credentials?.refresh_token;
        const refreshToken = typeof storedRefresh === 'string' && storedRefresh.trim()
            ? (0, tokenCrypto_1.decryptToken)(storedRefresh)
            : storedRefresh;
        if (typeof refreshToken !== 'string' || !refreshToken.trim()) {
            throw new common_1.BadRequestException(`Missing refresh_token for email account ${accountId}`);
        }
        const clientId = process.env.GMAIL_CLIENT_ID;
        const clientSecret = process.env.GMAIL_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            throw new common_1.BadRequestException('Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET environment variables');
        }
        const body = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        });
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body,
        });
        const payload = await response.json();
        if (!payload || typeof payload !== 'object') {
            throw new common_1.BadRequestException(`Failed to refresh token for email account ${accountId}`);
        }
        if (!response.ok) {
            const refreshPayload = payload;
            const providerError = typeof refreshPayload.error_description === 'string'
                ? refreshPayload.error_description
                : typeof refreshPayload.error === 'string'
                    ? refreshPayload.error
                    : 'Unknown provider error';
            const nonRecoverable = /invalid_grant|invalid_token|token_revoked|unauthorized/i.test(providerError);
            if (nonRecoverable) {
                try {
                    await this.prisma.emailAccount.update({
                        where: { id: accountId },
                        data: { is_active: false, updated_at: new Date() },
                    });
                    await this.prisma.auditLog.create({
                        data: {
                            tenant_id: account.tenant_id,
                            user_id: account.user_id,
                            action: 'email_account_deactivated',
                            entity_type: 'EmailAccount',
                            entity_id: accountId,
                            after_json: JSON.stringify({ reason: providerError }),
                        },
                    });
                }
                catch {
                }
            }
            throw new common_1.BadRequestException(`Failed to refresh token for email account ${accountId}: ${providerError}`);
        }
        const refreshPayload = payload;
        const accessToken = refreshPayload.access_token;
        const expiresIn = refreshPayload.expires_in;
        if (typeof accessToken !== 'string' || !accessToken.trim()) {
            throw new common_1.BadRequestException(`Provider response did not include access_token for ${accountId}`);
        }
        const nextCredentials = {
            ...(credentials || {}),
            access_token: accessToken,
            refresh_token: typeof refreshPayload.refresh_token === 'string' &&
                refreshPayload.refresh_token.trim()
                ? (0, tokenCrypto_1.encryptToken)(String(refreshPayload.refresh_token))
                : credentials?.refresh_token,
            expires_at: typeof expiresIn === 'number' && Number.isFinite(expiresIn)
                ? new Date(Date.now() + expiresIn * 1000).toISOString()
                : null,
        };
        const updated = await this.prisma.emailAccount.update({
            where: { id: accountId },
            data: {
                credentials: nextCredentials,
                updated_at: new Date(),
            },
            select: {
                id: true,
                credentials: true,
            },
        });
        const updatedCredentials = this.readCredentials(updated.credentials);
        return {
            id: updated.id,
            access_token: updatedCredentials?.access_token,
            expires_at: updatedCredentials?.expires_at ?? null,
        };
    }
    initiateGoogleOAuth(state) {
        const clientId = process.env.GMAIL_CLIENT_ID;
        const redirectUri = process.env.GMAIL_REDIRECT_URI;
        this.logger.log(`initiateGoogleOAuth called hasClientId=${Boolean(clientId)} redirectUri=${redirectUri} stateLength=${state?.length ?? 0}`);
        if (!clientId || !redirectUri) {
            throw new common_1.BadRequestException('Missing GMAIL_CLIENT_ID or GMAIL_REDIRECT_URI environment variables');
        }
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: [
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.send',
            ].join(' '),
            state: state,
            access_type: 'offline',
            prompt: 'consent',
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }
    async handleGoogleOAuthCallback(code, state, tenantId, userId) {
        this.logger.log(`handleGoogleOAuthCallback called tenantId=${tenantId} userId=${userId} hasCode=${Boolean(code)} hasState=${Boolean(state)}`);
        const clientId = process.env.GMAIL_CLIENT_ID;
        const clientSecret = process.env.GMAIL_CLIENT_SECRET;
        const redirectUri = process.env.GMAIL_REDIRECT_URI;
        if (!clientId || !clientSecret || !redirectUri) {
            throw new common_1.BadRequestException('OAuth environment variables not configured');
        }
        const tokenBody = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
        });
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: tokenBody,
        });
        const tokenPayload = await tokenResponse.json();
        this.logger.log(`Token exchange response ok=${tokenResponse.ok} status=${tokenResponse.status}`);
        if (!tokenResponse.ok) {
            const errorMsg = typeof tokenPayload === 'object' && tokenPayload !== null
                ? JSON.stringify(tokenPayload)
                : 'Unknown error';
            throw new common_1.BadRequestException(`Token exchange failed (${tokenResponse.status}): ${errorMsg}`);
        }
        if (!tokenPayload || typeof tokenPayload !== 'object') {
            throw new common_1.BadRequestException('Invalid token response from Google');
        }
        const tokens = tokenPayload;
        const accessToken = tokens.access_token;
        const refreshToken = tokens.refresh_token;
        const expiresIn = tokens.expires_in;
        if (typeof accessToken !== 'string' || !accessToken.trim()) {
            throw new common_1.BadRequestException('Invalid token response from Google OAuth');
        }
        const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        const profilePayload = await profileResponse.json();
        this.logger.log(`Profile fetch response ok=${profileResponse.ok} status=${profileResponse.status}`);
        if (!profileResponse.ok) {
            const errorMsg = typeof profilePayload === 'object' && profilePayload !== null
                ? JSON.stringify(profilePayload)
                : 'Unknown error';
            throw new common_1.BadRequestException(`Failed to fetch Gmail profile (${profileResponse.status}): ${errorMsg}`);
        }
        if (!profilePayload || typeof profilePayload !== 'object') {
            throw new common_1.BadRequestException('Invalid profile response from Google');
        }
        const profile = profilePayload;
        const emailAddress = profile.emailAddress;
        if (typeof emailAddress !== 'string' || !emailAddress.trim()) {
            throw new common_1.BadRequestException('Could not extract email address from profile');
        }
        const existingAccount = await this.prisma.emailAccount.findFirst({
            where: {
                tenant_id: tenantId,
                user_id: userId,
                email_address: emailAddress.toLowerCase(),
            },
            select: {
                id: true,
                credentials: true,
            },
        });
        const existingCredentials = this.readCredentials(existingAccount?.credentials);
        const existingRefreshTokenEncrypted = existingCredentials?.refresh_token;
        const existingRefreshToken = existingRefreshTokenEncrypted
            ? (0, tokenCrypto_1.decryptToken)(existingRefreshTokenEncrypted)
            : undefined;
        const resolvedRefreshToken = typeof refreshToken === 'string' && refreshToken.trim()
            ? refreshToken
            : typeof existingRefreshToken === 'string' &&
                existingRefreshToken.trim()
                ? existingRefreshToken
                : null;
        if (!resolvedRefreshToken) {
            throw new common_1.BadRequestException('Google did not return a refresh token. Please reconnect Gmail and accept the consent prompt.');
        }
        const credentials = {
            ...(existingCredentials || {}),
            access_token: accessToken,
            refresh_token: typeof resolvedRefreshToken === 'string'
                ? (0, tokenCrypto_1.encryptToken)(resolvedRefreshToken)
                : resolvedRefreshToken,
            expires_at: typeof expiresIn === 'number' && Number.isFinite(expiresIn)
                ? new Date(Date.now() + expiresIn * 1000).toISOString()
                : null,
        };
        const emailAccount = await this.prisma.emailAccount.upsert({
            where: {
                tenant_id_user_id_email_address: {
                    tenant_id: tenantId,
                    user_id: userId,
                    email_address: emailAddress.toLowerCase(),
                },
            },
            update: {
                credentials: credentials,
                is_active: true,
                updated_at: new Date(),
            },
            create: {
                tenant_id: tenantId,
                user_id: userId,
                provider: 'gmail',
                email_address: emailAddress.toLowerCase(),
                credentials: credentials,
                is_active: true,
            },
            select: {
                id: true,
                email_address: true,
                provider: true,
            },
        });
        this.logger.log(`Email account upserted id=${emailAccount.id} email=${emailAccount.email_address} provider=${emailAccount.provider} tenantId=${tenantId}`);
        return emailAccount;
    }
    async getUserEmailAccounts(tenantId, userId) {
        return this.prisma.emailAccount.findMany({
            where: {
                tenant_id: tenantId,
                user_id: userId,
            },
            select: {
                id: true,
                email_address: true,
                provider: true,
                is_active: true,
                created_at: true,
            },
            orderBy: [{ created_at: 'desc' }],
        });
    }
    async disconnectEmailAccount(accountId, tenantId, userId) {
        const account = await this.prisma.emailAccount.findFirst({
            where: {
                id: accountId,
                tenant_id: tenantId,
                user_id: userId,
            },
            select: {
                id: true,
            },
        });
        if (!account) {
            throw new common_1.BadRequestException('Email account not found or unauthorized');
        }
        await this.prisma.emailAccount.delete({
            where: {
                id: account.id,
            },
        });
        return { success: true, id: accountId };
    }
    async processInboundEmail(tenantId, dto) {
        const emailAccount = await this.prisma.emailAccount.findFirst({
            where: {
                id: dto.email_account_id,
                ...(tenantId ? { tenant_id: tenantId } : {}),
                is_active: true,
            },
        });
        if (!emailAccount) {
            throw new common_1.BadRequestException(`Email account ${dto.email_account_id} not found or inactive`);
        }
        const resolvedTenantId = emailAccount.tenant_id;
        const existingMessage = await this.prisma.message.findFirst({
            where: {
                email_account_id: dto.email_account_id,
                external_id: dto.external_id,
            },
            include: {
                conversation: true,
            },
        });
        if (existingMessage) {
            const incomingReceivedAt = this.parseReceivedAt(dto.received_at);
            const needsCreatedAtUpgrade = incomingReceivedAt !== null &&
                Math.abs(existingMessage.created_at.getTime() - incomingReceivedAt.getTime()) > 1000;
            const existingPayload = existingMessage.raw_payload &&
                typeof existingMessage.raw_payload === 'object'
                ? existingMessage.raw_payload
                : {};
            const incomingPayload = dto.raw_payload && typeof dto.raw_payload === 'object'
                ? dto.raw_payload
                : {};
            const existingHtml = typeof existingPayload.body_html === 'string'
                ? existingPayload.body_html.trim()
                : '';
            const incomingHtml = typeof incomingPayload.body_html === 'string'
                ? incomingPayload.body_html.trim()
                : '';
            const needsBodyUpgrade = typeof dto.body === 'string' &&
                dto.body.trim().length > 0 &&
                dto.body !== existingMessage.body;
            const needsPayloadUpgrade = incomingHtml.length > 0 && !existingHtml;
            if (needsBodyUpgrade || needsPayloadUpgrade || needsCreatedAtUpgrade) {
                await this.prisma.message.update({
                    where: { id: existingMessage.id },
                    data: {
                        ...(needsBodyUpgrade ? { body: dto.body } : {}),
                        ...(needsCreatedAtUpgrade && incomingReceivedAt
                            ? { created_at: incomingReceivedAt }
                            : {}),
                        ...(needsPayloadUpgrade
                            ? {
                                raw_payload: {
                                    ...existingPayload,
                                    ...incomingPayload,
                                },
                                updated_at: new Date(),
                            }
                            : {}),
                    },
                });
                const refreshed = await this.prisma.message.findFirst({
                    where: { id: existingMessage.id },
                    include: { conversation: true },
                });
                if (refreshed) {
                    existingMessage.body = refreshed.body;
                    existingMessage.raw_payload = refreshed.raw_payload;
                }
            }
            const conversation = existingMessage.conversation;
            const client = await this.prisma.client.findUnique({
                where: { id: conversation.client_id },
            });
            if (!client) {
                throw new common_1.BadRequestException(`Client ${conversation.client_id} not found for existing message`);
            }
            return {
                message: existingMessage,
                conversation: { id: conversation.id },
                client: { id: client.id },
                is_duplicate: true,
            };
        }
        let client = await this.prisma.client.findFirst({
            where: {
                tenant_id: resolvedTenantId,
                email: dto.sender_email,
            },
        });
        if (!client) {
            client = await this.getOrCreateInboxPlaceholderClient(resolvedTenantId);
        }
        let conversation = await this.prisma.conversation.findFirst({
            where: {
                tenant_id: resolvedTenantId,
                client_id: client.id,
                email_account_id: dto.email_account_id,
                thread_id: dto.thread_id || undefined,
            },
        });
        if (!conversation) {
            conversation = await this.prisma.conversation.create({
                data: {
                    tenant_id: resolvedTenantId,
                    client_id: client.id,
                    email_account_id: dto.email_account_id,
                    subject: dto.subject,
                    channel: 'email',
                    thread_id: dto.thread_id,
                    status: 'open',
                    unread_count: 1,
                    last_message_at: dto.received_at
                        ? new Date(dto.received_at)
                        : new Date(),
                },
            });
        }
        const parsedReceivedAt = this.parseReceivedAt(dto.received_at);
        let message;
        try {
            message = await this.prisma.message.create({
                data: {
                    tenant_id: resolvedTenantId,
                    conversation_id: conversation.id,
                    sender_email: dto.sender_email,
                    sender_name: dto.sender_name || dto.sender_email,
                    body: dto.body,
                    channel: 'email',
                    is_read: false,
                    external_id: dto.external_id,
                    email_account_id: dto.email_account_id,
                    provider: dto.provider,
                    thread_id: dto.thread_id,
                    raw_payload: dto.raw_payload,
                    is_processed: false,
                    processing_status: 'pending',
                    direction: 'inbound',
                    ...(parsedReceivedAt ? { created_at: parsedReceivedAt } : {}),
                },
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002') {
                const duplicateMessage = await this.prisma.message.findFirst({
                    where: {
                        email_account_id: dto.email_account_id,
                        external_id: dto.external_id,
                    },
                    include: {
                        conversation: true,
                    },
                });
                if (duplicateMessage) {
                    const existingPayload = duplicateMessage.raw_payload &&
                        typeof duplicateMessage.raw_payload === 'object'
                        ? duplicateMessage.raw_payload
                        : {};
                    const incomingPayload = dto.raw_payload && typeof dto.raw_payload === 'object'
                        ? dto.raw_payload
                        : {};
                    const existingHtml = typeof existingPayload.body_html === 'string'
                        ? existingPayload.body_html.trim()
                        : '';
                    const incomingHtml = typeof incomingPayload.body_html === 'string'
                        ? incomingPayload.body_html.trim()
                        : '';
                    if (incomingHtml.length > 0 && !existingHtml) {
                        await this.prisma.message.update({
                            where: { id: duplicateMessage.id },
                            data: {
                                raw_payload: {
                                    ...existingPayload,
                                    ...incomingPayload,
                                },
                                updated_at: new Date(),
                            },
                        });
                    }
                    const duplicateClient = await this.prisma.client.findUnique({
                        where: { id: duplicateMessage.conversation.client_id },
                    });
                    if (!duplicateClient) {
                        throw new common_1.BadRequestException(`Client ${duplicateMessage.conversation.client_id} not found for duplicate message`);
                    }
                    return {
                        message: duplicateMessage,
                        conversation: { id: duplicateMessage.conversation.id },
                        client: { id: duplicateClient.id },
                        is_duplicate: true,
                    };
                }
            }
            throw error;
        }
        await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: {
                unread_count: { increment: 1 },
                last_message_at: dto.received_at
                    ? new Date(dto.received_at)
                    : new Date(),
            },
        });
        return {
            message,
            conversation: { id: conversation.id },
            client: { id: client.id },
            is_duplicate: false,
        };
    }
    async getPendingOutboundEmails(tenantId, limit = 100) {
        const emails = await this.prisma.outboundEmail.findMany({
            where: {
                ...(tenantId ? { tenant_id: tenantId } : {}),
                status: 'pending',
            },
            include: {
                email_account: true,
            },
            take: limit,
            orderBy: [{ created_at: 'asc' }],
        });
        const tokenByAccountId = new Map();
        const isTokenExpired = (expiresAt) => {
            if (!expiresAt) {
                return true;
            }
            const expiry = Date.parse(expiresAt);
            if (Number.isNaN(expiry)) {
                return true;
            }
            return expiry <= Date.now() + 60_000;
        };
        for (const email of emails) {
            if (tokenByAccountId.has(email.email_account_id)) {
                continue;
            }
            const credentials = this.readCredentials(email.email_account.credentials);
            const existingToken = typeof credentials?.access_token === 'string' &&
                credentials.access_token.trim().length > 0
                ? credentials.access_token
                : undefined;
            const expiresAt = typeof credentials?.expires_at === 'string'
                ? credentials.expires_at
                : undefined;
            let token = existingToken;
            if (email.email_account.provider === 'gmail' &&
                (!token || isTokenExpired(expiresAt))) {
                try {
                    const refreshed = await this.refreshEmailAccountAccessToken(email.email_account_id, email.tenant_id);
                    token =
                        typeof refreshed.access_token === 'string'
                            ? refreshed.access_token
                            : token;
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : 'Unknown refresh error';
                    this.logger.error(`Failed to refresh access token for account ${email.email_account_id}: ${message}`);
                }
            }
            tokenByAccountId.set(email.email_account_id, token);
        }
        return emails.map((email) => ({
            id: email.id,
            tenant_id: email.tenant_id,
            email_account_id: email.email_account_id,
            provider: email.email_account.provider,
            access_token: tokenByAccountId.get(email.email_account_id),
            to: email.to,
            cc: email.cc ? email.cc : undefined,
            subject: email.subject,
            body: email.body,
            attempts: email.attempts,
        }));
    }
    async updateOutboundEmailStatus(tenantId, emailId, update) {
        const email = await this.prisma.outboundEmail.findFirst({
            where: {
                id: emailId,
                ...(tenantId ? { tenant_id: tenantId } : {}),
            },
        });
        if (!email) {
            throw new common_1.BadRequestException(`OutboundEmail ${emailId} not found`);
        }
        const result = await this.prisma.outboundEmail.update({
            where: { id: emailId },
            data: {
                status: update.status,
                provider: update.provider,
                last_error: update.last_error,
                attempts: update.attempts ?? { increment: 1 },
                sent_at: update.status === 'sent' ? new Date() : undefined,
                updated_at: new Date(),
            },
        });
        return result;
    }
    async createOutboundEmail(tenantId, data) {
        const email = await this.prisma.outboundEmail.create({
            data: {
                tenant_id: tenantId,
                email_account_id: data.email_account_id,
                to: data.to,
                cc: data.cc,
                subject: data.subject,
                body: data.body,
                status: 'pending',
            },
        });
        return email;
    }
    async sendNow(tenantId, data) {
        this.logger.log(`sendNow called tenantId=${tenantId} emailAccountId=${data.email_account_id} to=${data.to?.join(',')} subject=${data.subject} attachments=${data.attachments?.length || 0}`);
        const account = await this.prisma.emailAccount.findFirst({
            where: {
                id: data.email_account_id,
                tenant_id: tenantId,
                is_active: true,
            },
        });
        if (!account) {
            this.logger.error(`Email account not found emailAccountId=${data.email_account_id} tenantId=${tenantId}`);
            throw new common_1.BadRequestException('Email account not found or not active');
        }
        this.logger.log(`Email account found id=${account.id} email=${account.email_address} provider=${account.provider}`);
        if (account.provider !== 'gmail') {
            this.logger.error(`Unsupported provider: ${account.provider}`);
            throw new common_1.BadRequestException('Immediate send is only supported for Gmail accounts');
        }
        const credentials = this.readCredentials(account.credentials) || {};
        let accessToken = typeof credentials.access_token === 'string'
            ? credentials.access_token
            : undefined;
        const expiresAt = typeof credentials.expires_at === 'string'
            ? credentials.expires_at
            : undefined;
        const isExpired = (expires) => {
            if (!expires)
                return true;
            const ts = Date.parse(expires);
            if (Number.isNaN(ts))
                return true;
            return ts <= Date.now() + 60_000;
        };
        if (!accessToken || isExpired(expiresAt)) {
            this.logger.log('Access token expired or missing, refreshing...');
            try {
                const refreshed = await this.refreshEmailAccountAccessToken(account.id, tenantId);
                accessToken = refreshed.access_token;
                this.logger.log('Access token refreshed successfully');
            }
            catch (err) {
                this.logger.error(`Failed to refresh access token: ${err instanceof Error ? err.message : String(err)} accountId=${account.id}`);
                throw new common_1.BadRequestException('Could not refresh Gmail access token');
            }
        }
        else {
            this.logger.log('Using existing access token');
        }
        const fromAddress = account.email_address;
        const rawMessage = this.buildRawMimeMessage({
            from: fromAddress,
            to: data.to || [],
            cc: data.cc,
            subject: data.subject,
            body: data.body || '',
            attachments: data.attachments,
        });
        const encoded = Buffer.from(rawMessage)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/g, '');
        const sendUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
        this.logger.log(`Sending email via Gmail API to=${data.to?.join(',')} from=${fromAddress} messageSize=${rawMessage.length}`);
        let sendResponse = null;
        try {
            sendResponse = await fetch(sendUrl, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ raw: encoded }),
            });
        }
        catch (err) {
            this.logger.error(`Gmail send network error: ${err instanceof Error ? err.message : String(err)}`, err instanceof Error ? err.stack : undefined);
        }
        const sent = Boolean(sendResponse &&
            typeof sendResponse === 'object' &&
            'ok' in sendResponse &&
            sendResponse['ok'] === true);
        let providerResult = {};
        let responseStatus;
        let responseStatusText;
        if (sendResponse && typeof sendResponse === 'object') {
            responseStatus = sendResponse.status;
            responseStatusText = sendResponse.statusText;
            if (typeof sendResponse['json'] === 'function') {
                try {
                    const jsonFn = sendResponse.json;
                    const parsed = await jsonFn();
                    if (parsed && typeof parsed === 'object') {
                        providerResult = parsed;
                    }
                }
                catch (jsonErr) {
                    this.logger.error(`Failed to parse Gmail API response: ${jsonErr instanceof Error ? jsonErr.message : String(jsonErr)}`);
                    providerResult = {};
                }
            }
        }
        this.logger.log(`Gmail API response sent=${sent} status=${responseStatus} statusText=${responseStatusText} messageId=${providerResult.id}`);
        const outbound = await this.prisma.outboundEmail.create({
            data: {
                tenant_id: tenantId,
                email_account_id: account.id,
                to: data.to,
                cc: data.cc,
                subject: data.subject,
                body: data.body,
                status: sent ? 'sent' : 'failed',
                provider: 'gmail',
                last_error: sent ? undefined : JSON.stringify(providerResult || {}),
                sent_at: sent ? new Date() : undefined,
            },
        });
        if (!sent) {
            const errorMessage = `Failed to send email via Gmail: ${JSON.stringify(providerResult)}`;
            this.logger.error(`Email send failed outboundId=${outbound.id} status=${responseStatus} statusText=${responseStatusText}`);
            throw new common_1.BadRequestException(errorMessage);
        }
        this.logger.log(`✓ Email sent successfully outboundId=${outbound.id} messageId=${providerResult.id} to=${data.to?.join(',')}`);
        return {
            success: true,
            outbound_id: outbound.id,
            provider_response: providerResult,
        };
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EmailService);
//# sourceMappingURL=email.service.js.map