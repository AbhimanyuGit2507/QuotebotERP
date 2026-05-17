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
exports.EmailController = void 0;
const common_1 = require("@nestjs/common");
const email_service_1 = require("./email.service");
const inbound_email_dto_1 = require("./dtos/inbound-email.dto");
const outbound_email_update_dto_1 = require("./dtos/outbound-email-update.dto");
const internal_key_auth_guard_1 = require("../common/guards/internal-key-auth.guard");
let EmailController = class EmailController {
    emailService;
    constructor(emailService) {
        this.emailService = emailService;
    }
    async inboundEmail(req, dto) {
        const tenantId = req['tenantId'];
        if (!tenantId) {
            throw new common_1.BadRequestException('Tenant ID not found in request');
        }
        const rawResult = await this.emailService.processInboundEmail(tenantId, dto);
        const result = rawResult;
        return {
            success: true,
            message: result.message,
            conversation_id: result.conversation.id,
            client_id: result.client.id,
            is_duplicate: result.is_duplicate || false,
        };
    }
    async getOutboundEmails(req, status = 'pending', limit = '100') {
        const tenantId = req['tenantId'];
        if (!tenantId) {
            throw new common_1.BadRequestException('Tenant ID not found in request');
        }
        if (status !== 'pending') {
            return [];
        }
        const parsedLimit = Number.parseInt(limit, 10);
        const safeLimit = Number.isFinite(parsedLimit)
            ? Math.min(Math.max(parsedLimit, 1), 500)
            : 100;
        const emails = await this.emailService.getPendingOutboundEmails(tenantId, safeLimit);
        return emails;
    }
    async updateOutboundEmailStatus(req, emailId, dto) {
        const tenantId = req['tenantId'];
        if (!tenantId) {
            throw new common_1.BadRequestException('Tenant ID not found in request');
        }
        const updated = await this.emailService.updateOutboundEmailStatus(tenantId, emailId, dto);
        return {
            success: true,
            data: updated,
        };
    }
};
exports.EmailController = EmailController;
__decorate([
    (0, common_1.Post)('inbound'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, inbound_email_dto_1.InboundEmailDto]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "inboundEmail", null);
__decorate([
    (0, common_1.Get)('outbound'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "getOutboundEmails", null);
__decorate([
    (0, common_1.Patch)('outbound/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, outbound_email_update_dto_1.OutboundEmailUpdateDto]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "updateOutboundEmailStatus", null);
exports.EmailController = EmailController = __decorate([
    (0, common_1.Controller)('internal/email'),
    (0, common_1.UseGuards)(internal_key_auth_guard_1.InternalKeyAuthGuard),
    __metadata("design:paramtypes", [email_service_1.EmailService])
], EmailController);
//# sourceMappingURL=email.controller.js.map