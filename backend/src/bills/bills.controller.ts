import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { BillsService } from './bills.service';

@Controller('bills')
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Get()
  async list(@Req() req: any, @Query('limit') limit?: string) {
    const tenantId = req?.tenant?.id || req?.headers?.['x-tenant-id'] || '';
    const n = limit ? Number(limit) : 50;
    return this.billsService.listBills(tenantId, n);
  }

  @Get(':id')
  async get(@Req() req: any, @Param('id') id: string) {
    const tenantId = req?.tenant?.id || req?.headers?.['x-tenant-id'] || '';
    return this.billsService.getBill(tenantId, id);
  }
}
