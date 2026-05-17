import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import path from 'path';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(__dirname, '..', '..', '.env'),
        path.resolve(process.cwd(), '.env'),
      ],
    }),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRATION || '24h') as StringValue,
      },
    }),
  ],
  providers: [PrismaService],
  exports: [PrismaService, ConfigModule, JwtModule],
})
export class CommonModule {}
