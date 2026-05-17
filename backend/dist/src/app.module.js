"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const common_module_1 = require("./common/common.module");
const auth_module_1 = require("./auth/auth.module");
const products_module_1 = require("./products/products.module");
const clients_module_1 = require("./clients/clients.module");
const rfqs_module_1 = require("./rfqs/rfqs.module");
const quotations_module_1 = require("./quotations/quotations.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const analytics_module_1 = require("./analytics/analytics.module");
const settings_module_1 = require("./settings/settings.module");
const files_module_1 = require("./files/files.module");
const activities_module_1 = require("./activities/activities.module");
const audit_module_1 = require("./audit/audit.module");
const parse_runs_module_1 = require("./parse-runs/parse-runs.module");
const users_module_1 = require("./users/users.module");
const inbox_module_1 = require("./inbox/inbox.module");
const email_module_1 = require("./email/email.module");
const email_rfq_module_1 = require("./email-rfq/email-rfq.module");
const admin_module_1 = require("./admin/admin.module");
const invoices_module_1 = require("./invoices/invoices.module");
const accounting_integrations_module_1 = require("./integrations/accounting-integrations.module");
const imports_module_1 = require("./imports/imports.module");
const zoho_module_1 = require("./integrations/zoho/zoho.module");
const odoo_module_1 = require("./integrations/odoo/odoo.module");
const conversations_module_1 = require("./conversations/conversations.module");
const assistance_module_1 = require("./assistance/assistance.module");
const orders_module_1 = require("./orders/orders.module");
const email_templates_module_1 = require("./email-templates/email-templates.module");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            schedule_1.ScheduleModule.forRoot(),
            common_module_1.CommonModule,
            auth_module_1.AuthModule,
            products_module_1.ProductsModule,
            clients_module_1.ClientsModule,
            rfqs_module_1.RfqsModule,
            quotations_module_1.QuotationsModule,
            dashboard_module_1.DashboardModule,
            analytics_module_1.AnalyticsModule,
            settings_module_1.SettingsModule,
            files_module_1.FilesModule,
            activities_module_1.ActivitiesModule,
            audit_module_1.AuditModule,
            parse_runs_module_1.ParseRunsModule,
            users_module_1.UsersModule,
            inbox_module_1.InboxModule,
            email_module_1.EmailModule,
            email_rfq_module_1.EmailRfqModule,
            admin_module_1.AdminModule,
            invoices_module_1.InvoicesModule,
            accounting_integrations_module_1.AccountingIntegrationsModule,
            zoho_module_1.ZohoModule,
            odoo_module_1.OdooModule,
            imports_module_1.ImportsModule,
            conversations_module_1.ConversationsModule,
            assistance_module_1.AssistanceModule,
            orders_module_1.OrdersModule,
            email_templates_module_1.EmailTemplatesModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map