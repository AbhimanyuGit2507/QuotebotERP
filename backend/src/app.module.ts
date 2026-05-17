import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { ClientsModule } from './clients/clients.module';
import { RfqsModule } from './rfqs/rfqs.module';
import { QuotationsModule } from './quotations/quotations.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SettingsModule } from './settings/settings.module';
import { FilesModule } from './files/files.module';
import { ActivitiesModule } from './activities/activities.module';
import { AuditModule } from './audit/audit.module';
import { ParseRunsModule } from './parse-runs/parse-runs.module';
import { UsersModule } from './users/users.module';
import { InboxModule } from './inbox/inbox.module';
import { EmailModule } from './email/email.module';
import { EmailRfqModule } from './email-rfq/email-rfq.module';
import { AdminModule } from './admin/admin.module';
import { InvoicesModule } from './invoices/invoices.module';
import { AccountingIntegrationsModule } from './integrations/accounting-integrations.module';
import { ImportsModule } from './imports/imports.module';
import { ZohoModule } from './integrations/zoho/zoho.module';
import { OdooModule } from './integrations/odoo/odoo.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    ProductsModule,
    ClientsModule,
    RfqsModule,
    QuotationsModule,
    DashboardModule,
    AnalyticsModule,
    SettingsModule,
    FilesModule,
    ActivitiesModule,
    AuditModule,
    ParseRunsModule,
    UsersModule,
    InboxModule,
    EmailModule,
    EmailRfqModule,
    AdminModule,
    InvoicesModule,
    AccountingIntegrationsModule,
    ZohoModule,
    OdooModule,
    ImportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
