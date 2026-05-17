import { Module } from '@nestjs/common';
import { OdooController } from './odoo.controller';
import { OdooService } from './odoo.service';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [OdooController],
  providers: [OdooService],
  exports: [OdooService],
})
export class OdooModule {}
