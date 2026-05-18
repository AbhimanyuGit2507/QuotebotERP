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
exports.InvoicesController = void 0;
const common_1 = require("@nestjs/common");
const invoices_service_1 = require("./invoices.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const common_2 = require("@nestjs/common");
let InvoicesController = class InvoicesController {
    invoicesService;
    constructor(invoicesService) {
        this.invoicesService = invoicesService;
    }
    async create(req, body) {
        const tenantId = req.user?.tenant_id;
        if (!tenantId)
            throw new common_2.BadRequestException('Missing tenant id');
        return this.invoicesService.create(tenantId, body);
    }
    async list(req, status, search, page, pageSize, sortBy, sortOrder) {
        const tenantId = req.user?.tenant_id;
        if (!tenantId)
            throw new common_2.BadRequestException('Missing tenant id');
        return this.invoicesService.list(tenantId, {
            status,
            search,
            page: page ? Number(page) : undefined,
            pageSize: pageSize ? Number(pageSize) : undefined,
            sortBy,
            sortOrder: sortOrder,
        });
    }
    async get(req, id) {
        const tenantId = req.user?.tenant_id;
        if (!tenantId)
            throw new common_2.BadRequestException('Missing tenant id');
        return this.invoicesService.get(tenantId, id);
    }
    async getQuotation(req, id) {
        const tenantId = req.user?.tenant_id;
        if (!tenantId)
            throw new common_2.BadRequestException('Missing tenant id');
        return this.invoicesService.getRelatedQuotation(tenantId, id);
    }
    async getPurchaseOrders(req, id) {
        const tenantId = req.user?.tenant_id;
        if (!tenantId)
            throw new common_2.BadRequestException('Missing tenant id');
        return this.invoicesService.getRelatedPurchaseOrders(tenantId, id);
    }
    async recordPayment(req, id, body) {
        const tenantId = req.user?.tenant_id;
        if (!tenantId)
            throw new common_2.BadRequestException('Missing tenant id');
        return this.invoicesService.recordPayment(tenantId, id, body);
    }
};
exports.InvoicesController = InvoicesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], InvoicesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('pageSize')),
    __param(5, (0, common_1.Query)('sortBy')),
    __param(6, (0, common_1.Query)('sortOrder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], InvoicesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], InvoicesController.prototype, "get", null);
__decorate([
    (0, common_1.Get)(':id/quotation'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], InvoicesController.prototype, "getQuotation", null);
__decorate([
    (0, common_1.Get)(':id/purchase-orders'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], InvoicesController.prototype, "getPurchaseOrders", null);
__decorate([
    (0, common_1.Post)(':id/payments'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], InvoicesController.prototype, "recordPayment", null);
exports.InvoicesController = InvoicesController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('invoices'),
    __metadata("design:paramtypes", [invoices_service_1.InvoicesService])
], InvoicesController);
exports.default = InvoicesController;
//# sourceMappingURL=invoices.controller.js.map