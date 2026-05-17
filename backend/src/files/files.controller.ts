import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { UploadFileDto } from './dtos/upload-file.dto';

@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.filesService.findAll(user.tenant_id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.filesService.findOne(id, user.tenant_id);
  }

  @Post('upload')
  upload(@CurrentUser() user: AuthenticatedUser, @Body() body: UploadFileDto) {
    return this.filesService.create(user.tenant_id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.filesService.remove(id, user.tenant_id);
  }
}
