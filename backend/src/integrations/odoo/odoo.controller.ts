import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { OdooService } from './odoo.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BadRequestException } from '@nestjs/common';

type AuthRequest = Request & {
  user?: { tenant_id?: string };
};

@Controller('integrations/odoo')
export class OdooController {
  constructor(private readonly odooService: OdooService) {}

  @Post('test-connection')
  async testConnection(
    @Body()
    body: {
      url: string;
      db?: string;
      username?: string;
      password?: string;
    },
  ) {
    return this.odooService.testConnection(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('partners')
  async listPartners(
    @Body()
    body: {
      url: string;
      db: string;
      username: string;
      password: string;
      limit?: number;
    },
  ) {
    return this.odooService.listPartners(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('products')
  async listProducts(
    @Body()
    body: {
      url: string;
      db: string;
      username: string;
      password: string;
      limit?: number;
    },
  ) {
    return this.odooService.listProducts(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('import/partners')
  async importPartners(
    @Req() req: AuthRequest,
    @Body()
    body: {
      partners: any[];
      overrides?: Array<{
        externalId: string;
        localEntity: string;
        localId: string;
      }>;
    },
  ) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) throw new BadRequestException('Missing tenant id');
    return this.odooService.importPartners(
      tenantId,
      body.partners || [],
      body.overrides || [],
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('import/products')
  async importProducts(
    @Req() req: AuthRequest,
    @Body()
    body: {
      products: any[];
      overrides?: Array<{
        externalId: string;
        localEntity: string;
        localId: string;
      }>;
    },
  ) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) throw new BadRequestException('Missing tenant id');
    return this.odooService.importProducts(
      tenantId,
      body.products || [],
      body.overrides || [],
    );
  }
}
