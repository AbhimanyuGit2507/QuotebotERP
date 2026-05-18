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
exports.QuotationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const quotations_service_1 = require("./quotations.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const quotations_query_dto_1 = require("./dtos/quotations-query.dto");
const create_quotation_dto_1 = require("./dtos/create-quotation.dto");
const update_quotation_dto_1 = require("./dtos/update-quotation.dto");
const send_quotation_email_dto_1 = require("./dtos/send-quotation-email.dto");
let QuotationsController = class QuotationsController {
    quotationsService;
    constructor(quotationsService) {
        this.quotationsService = quotationsService;
    }
    findAll(user, query, page, pageSize, sortBy, sortOrder) {
        return this.quotationsService.findAll(user.tenant_id, {
            search: query.search,
            status: query.status,
            page: page ? Number(page) : undefined,
            pageSize: pageSize ? Number(pageSize) : undefined,
            sortBy,
            sortOrder: sortOrder,
        });
    }
    async exportCsv(user, query, res) {
        const csv = await this.quotationsService.exportCsv(user.tenant_id, query);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="quotations-export.csv"');
        return res.send(csv);
    }
    async printable(id, user, res) {
        const pdf = await this.quotationsService.generatePdfBuffer(id, user.tenant_id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="quotation-${id}.pdf"`);
        return res.send(pdf);
    }
    findOne(id, user) {
        return this.quotationsService.findOne(id, user.tenant_id);
    }
    create(user, body) {
        return this.quotationsService.create(user.tenant_id, body);
    }
    update(id, user, body) {
        return this.quotationsService.update(id, user.tenant_id, body);
    }
    updateStatus(id, user, status) {
        const allowedStatuses = ['draft', 'sent', 'accepted', 'declined'];
        if (!allowedStatuses.includes(status)) {
            throw new common_1.BadRequestException('Invalid quotation status');
        }
        return this.quotationsService.updateStatus(id, user.tenant_id, status);
    }
    duplicate(id, user) {
        return this.quotationsService.duplicate(id, user.tenant_id);
    }
    sendByEmail(id, user, body) {
        return this.quotationsService.sendByEmail(id, user.tenant_id, body);
    }
    getPurchaseOrders(id, user) {
        return this.quotationsService.getRelatedPurchaseOrders(id, user.tenant_id);
    }
    getInvoices(id, user) {
        return this.quotationsService.getRelatedInvoices(id, user.tenant_id);
    }
    approve(id, user) {
        return this.quotationsService.approve(id, user.tenant_id, user.id);
    }
    reject(id, reason, user) {
        return this.quotationsService.reject(id, user.tenant_id, user.id, reason);
    }
    remove(id, user, force, forceDelete) {
        const forceFlag = Boolean(force === 'true' || force === '1');
        if (forceDelete === 'true') {
            return this.quotationsService.forceDelete(id, user.tenant_id, {
                forceDeleteLinkedRfq: forceFlag,
            });
        }
        return this.quotationsService.remove(id, user.tenant_id, {
            forceDeleteLinkedRfq: forceFlag,
        });
    }
};
exports.QuotationsController = QuotationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('pageSize')),
    __param(4, (0, common_1.Query)('sortBy')),
    __param(5, (0, common_1.Query)('sortOrder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, quotations_query_dto_1.QuotationsQueryDto, String, String, String, String]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('export/csv'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, quotations_query_dto_1.QuotationsQueryDto, Object]),
    __metadata("design:returntype", Promise)
], QuotationsController.prototype, "exportCsv", null);
__decorate([
    (0, common_1.Get)(':id/pdf'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], QuotationsController.prototype, "printable", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_quotation_dto_1.CreateQuotationDto]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_quotation_dto_1.UpdateQuotationDto]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "update", null);
__decorate([
    (0, common_1.Put)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':id/duplicate'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "duplicate", null);
__decorate([
    (0, common_1.Post)(':id/send'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, send_quotation_email_dto_1.SendQuotationEmailDto]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "sendByEmail", null);
__decorate([
    (0, common_1.Get)(':id/purchase-orders'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "getPurchaseOrders", null);
__decorate([
    (0, common_1.Get)(':id/invoices'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "getInvoices", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reason')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "reject", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)('forceDeleteLinkedRfq')),
    __param(3, (0, common_1.Query)('forceDelete')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "remove", null);
exports.QuotationsController = QuotationsController = __decorate([
    (0, swagger_1.ApiTags)('Quotations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('quotations'),
    __metadata("design:paramtypes", [quotations_service_1.QuotationsService])
], QuotationsController);
//# sourceMappingURL=quotations.controller.js.map