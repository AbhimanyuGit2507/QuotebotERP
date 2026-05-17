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
exports.InternalEmailAccountsController = void 0;
const common_1 = require("@nestjs/common");
const internal_key_auth_guard_1 = require("../common/guards/internal-key-auth.guard");
const email_service_1 = require("./email.service");
let InternalEmailAccountsController = class InternalEmailAccountsController {
    emailService;
    constructor(emailService) {
        this.emailService = emailService;
    }
    async getEmailAccounts(req) {
        const tenantId = req['tenantId'];
        if (!tenantId) {
            throw new common_1.BadRequestException('Tenant ID not found in request');
        }
        return this.emailService.getActiveEmailAccounts(tenantId);
    }
    async refreshEmailAccount(req, id) {
        const tenantId = req['tenantId'];
        if (!tenantId) {
            throw new common_1.BadRequestException('Tenant ID not found in request');
        }
        return this.emailService.refreshEmailAccountAccessToken(id, tenantId);
    }
};
exports.InternalEmailAccountsController = InternalEmailAccountsController;
__decorate([
    (0, common_1.Get)('email-accounts'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InternalEmailAccountsController.prototype, "getEmailAccounts", null);
__decorate([
    (0, common_1.Post)('email-accounts/:id/refresh'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], InternalEmailAccountsController.prototype, "refreshEmailAccount", null);
exports.InternalEmailAccountsController = InternalEmailAccountsController = __decorate([
    (0, common_1.Controller)('internal'),
    (0, common_1.UseGuards)(internal_key_auth_guard_1.InternalKeyAuthGuard),
    __metadata("design:paramtypes", [email_service_1.EmailService])
], InternalEmailAccountsController);
//# sourceMappingURL=internal-email-accounts.controller.js.map