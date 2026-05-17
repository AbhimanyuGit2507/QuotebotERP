import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { ZohoService } from './zoho.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

type AuthRequest = Request & { user?: { id?: string; tenant_id?: string } };

type ZohoResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
  rows?: unknown;
};

@Controller('integrations/zoho')
export class ZohoController {
  constructor(private readonly zohoService: ZohoService) {}

  @UseGuards(JwtAuthGuard)
  @Get('auth-url')
  getAuthUrl(@Req() req: AuthRequest) {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    return this.zohoService.getAuthorizationUrl(tenantId, userId);
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state?: string,
  ): Promise<ZohoResult> {
    return this.zohoService.handleCallback(code, state);
  }

  @Post('exchange')
  async exchangeCode(
    @Body() body: { code: string; tenant_id?: string },
  ): Promise<ZohoResult> {
    return this.zohoService.exchangeCode(body.code, body.tenant_id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('customers')
  async listCustomers(@Req() req: AuthRequest): Promise<ZohoResult> {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) throw new BadRequestException('Missing tenant id');
    return this.zohoService.listCustomers(tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('items')
  async listItems(@Req() req: AuthRequest): Promise<ZohoResult> {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) throw new BadRequestException('Missing tenant id');
    return this.zohoService.listItems(tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('import/customers')
  async importCustomers(
    @Req() req: AuthRequest,
    @Body()
    body?: {
      overrides?: Array<{
        externalId: string;
        localEntity: string;
        localId: string;
      }>;
    },
  ): Promise<ZohoResult> {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) throw new BadRequestException('Missing tenant id');
    return this.zohoService.importCustomers(tenantId, body?.overrides || []);
  }

  @UseGuards(JwtAuthGuard)
  @Post('import/items')
  async importItems(
    @Req() req: AuthRequest,
    @Body()
    body?: {
      overrides?: Array<{
        externalId: string;
        localEntity: string;
        localId: string;
      }>;
    },
  ): Promise<ZohoResult> {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) throw new BadRequestException('Missing tenant id');
    return this.zohoService.importItems(tenantId, body?.overrides || []);
  }

  @UseGuards(JwtAuthGuard)
  @Post('preview/customers')
  async previewCustomers(@Req() req: AuthRequest): Promise<ZohoResult> {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) throw new BadRequestException('Missing tenant id');
    const resp = await this.zohoService.listCustomers(tenantId);
    if (!resp.ok) return resp;
    const payload = resp.data as Record<string, unknown> | undefined;
    const contacts = Array.isArray(payload?.contacts)
      ? payload.contacts
      : Array.isArray(payload?.data)
        ? payload.data
        : [];
    // basic normalization and mapping suggestion with safe checks
    const getString = (v: unknown) => (typeof v === 'string' ? v : null);
    const mappings = contacts.map((contact) => {
      const item = contact as Record<string, unknown>;
      const externalId = getString(item.contact_id ?? item.contact_id);
      const name = getString(item.contact_name ?? item.name);
      let email = getString(item.email);
      const contactPersons = item.contact_persons;
      if (!email && Array.isArray(contactPersons) && contactPersons[0]) {
        const firstPerson = contactPersons[0] as Record<string, unknown>;
        email = getString(firstPerson.email);
      }
      return { externalId, name, email };
    });
    return { ok: true, rows: mappings };
  }

  @UseGuards(JwtAuthGuard)
  @Post('preview/items')
  async previewItems(@Req() req: AuthRequest): Promise<ZohoResult> {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) throw new BadRequestException('Missing tenant id');
    const resp = await this.zohoService.listItems(tenantId);
    if (!resp.ok) return resp;
    const payload = resp.data as Record<string, unknown> | undefined;
    const items = Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.data)
        ? payload.data
        : [];
    const getString = (v: unknown) => (typeof v === 'string' ? v : null);
    const getNumber = (v: unknown) =>
      typeof v === 'number' ? v : Number(v) || 0;
    const rows = items.map((item) => {
      const it = item as Record<string, unknown>;
      const sku = getString(it.sku ?? it.item_code ?? it.code ?? it.name);
      return {
        externalId: getString(it.item_id),
        sku,
        name: getString(it.name ?? it.item_name),
        price: getNumber(it.rate ?? it.list_price ?? 0),
      };
    });
    return { ok: true, rows };
  }
}
