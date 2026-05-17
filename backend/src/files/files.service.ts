import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.file.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const file = await this.prisma.file.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  async create(
    tenantId: string,
    body: {
      filename: string;
      mime_type: string;
      size: number;
      storage_path: string;
    },
  ) {
    return this.prisma.file.create({
      data: {
        tenant_id: tenantId,
        filename: body.filename,
        mime_type: body.mime_type,
        size: Number(body.size),
        storage_path: body.storage_path,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    await this.prisma.file.delete({ where: { id } });
    return { message: 'File deleted successfully' };
  }
}
