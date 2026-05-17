import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ImportsService } from './imports.service';

type ImportEntity = 'clients' | 'products';

interface ImportPreviewRequest {
  entity: ImportEntity;
  rows: Array<Record<string, unknown>>;
}

interface ImportCommitRequest {
  entity: ImportEntity;
  rows: Array<Record<string, unknown>>;
}

@UseGuards(JwtAuthGuard)
@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('preview')
  preview(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ImportPreviewRequest,
  ) {
    return this.importsService.preview(user.tenant_id, body);
  }

  @Post('commit')
  commit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ImportCommitRequest,
  ) {
    return this.importsService.commit(user.tenant_id, body);
  }
}
