import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenant_id: tenantId },
      include: { role: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenant_id: tenantId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async getRoleByName(roleName: string) {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new BadRequestException('Invalid role');
    }

    return role;
  }

  async create(
    tenantId: string,
    body: {
      email: string;
      name: string;
      password: string;
      role?: string;
      status?: string;
    },
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const role = await this.getRoleByName(body.role ?? 'user');
    const password_hash = await bcrypt.hash(body.password, 10);

    return this.prisma.user.create({
      data: {
        tenant_id: tenantId,
        email: body.email,
        name: body.name,
        password_hash,
        role_id: role.id,
        status: body.status ?? 'active',
      },
      include: { role: true },
    });
  }

  async update(
    id: string,
    tenantId: string,
    body: Partial<{
      email: string;
      name: string;
      password: string;
      role: string;
      status: string;
      permissions: Record<string, unknown>;
    }>,
  ) {
    await this.findOne(id, tenantId);

    const role = body.role ? await this.getRoleByName(body.role) : null;
    const password_hash = body.password
      ? await bcrypt.hash(body.password, 10)
      : undefined;

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(body.email ? { email: body.email } : {}),
        ...(body.name ? { name: body.name } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(role ? { role: { connect: { id: role.id } } } : {}),
        ...(password_hash ? { password_hash } : {}),
        ...(body.permissions !== undefined
          ? { permissions: body.permissions as Prisma.InputJsonValue }
          : {}),
      },
      include: { role: true },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    await this.prisma.user.delete({ where: { id } });

    return { message: 'User deleted successfully' };
  }
}
