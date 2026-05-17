"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingIntegrationsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const accounting_integrations_service_1 = require("./accounting-integrations.service");
const common_2 = require("@nestjs/common");
let AccountingIntegrationsController = class AccountingIntegrationsController {
    integrationsService;
    constructor(integrationsService) {
        this.integrationsService = integrationsService;
    }
    status(req) {
        const tenantId = req.user?.tenant_id;
        if (!tenantId)
            throw new common_2.BadRequestException('Missing tenant id');
        return this.integrationsService.getStatus(tenantId);
    }
    authorizeXero(req) {
        const tenantId = req.user?.tenant_id;
        const userId = req.user?.id;
        if (!tenantId || !userId)
            throw new common_2.BadRequestException('Missing user context');
        return this.integrationsService.getXeroAuthorizeUrl(tenantId, userId);
    }
    authorizeQuickBooks(req) {
        const tenantId = req.user?.tenant_id;
        const userId = req.user?.id;
        if (!tenantId || !userId)
            throw new common_2.BadRequestException('Missing user context');
        return this.integrationsService.getQuickBooksAuthorizeUrl(tenantId, userId);
    }
    xeroCallback(code, state) {
        return this.integrationsService.handleXeroCallback(code, state);
    }
    quickbooksCallback(code, state, realmId) {
        return this.integrationsService.handleQuickBooksCallback(code, state, realmId);
    }
    exportInvoiceToXero(req, id) {
        const tenantId = req.user?.tenant_id;
        if (!tenantId)
            throw new common_2.BadRequestException('Missing tenant id');
        return this.integrationsService.exportInvoiceToXero(tenantId, id);
    }
    exportInvoiceToQuickBooks(req, id) {
        const tenantId = req.user?.tenant_id;
        if (!tenantId)
            throw new common_2.BadRequestException('Missing tenant id');
        return this.integrationsService.exportInvoiceToQuickBooks(tenantId, id);
    }
};
exports.AccountingIntegrationsController = AccountingIntegrationsController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('status'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingIntegrationsController.prototype, "status", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('xero/authorize'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingIntegrationsController.prototype, "authorizeXero", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('quickbooks/authorize'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingIntegrationsController.prototype, "authorizeQuickBooks", null);
__decorate([
    (0, common_1.Get)('xero/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AccountingIntegrationsController.prototype, "xeroCallback", null);
__decorate([
    (0, common_1.Get)('quickbooks/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Query)('realmId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AccountingIntegrationsController.prototype, "quickbooksCallback", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('xero/invoices/:id/export'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AccountingIntegrationsController.prototype, "exportInvoiceToXero", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('quickbooks/invoices/:id/export'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AccountingIntegrationsController.prototype, "exportInvoiceToQuickBooks", null);
exports.AccountingIntegrationsController = AccountingIntegrationsController = __decorate([
    (0, common_1.Controller)('integrations/accounting'),
    __metadata("design:paramtypes", [accounting_integrations_service_1.AccountingIntegrationsService])
], AccountingIntegrationsController);
exports.default = AccountingIntegrationsController;
//# sourceMappingURL=accounting-integrations.controller.js.map