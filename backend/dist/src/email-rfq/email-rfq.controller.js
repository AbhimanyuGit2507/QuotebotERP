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
exports.EmailRfqController = void 0;
const common_1 = require("@nestjs/common");
const internal_key_auth_guard_1 = require("../common/guards/internal-key-auth.guard");
const email_rfq_service_1 = require("./email-rfq.service");
let EmailRfqController = class EmailRfqController {
    emailRfqService;
    constructor(emailRfqService) {
        this.emailRfqService = emailRfqService;
    }
    processPending(req, body) {
        const tenantId = req['tenantId'];
        if (!tenantId) {
            throw new common_1.BadRequestException('Tenant ID not found in request');
        }
        return this.emailRfqService.processPendingMessages({
            tenantId,
            limit: body?.limit,
        });
    }
};
exports.EmailRfqController = EmailRfqController;
__decorate([
    (0, common_1.Post)('process-pending'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], EmailRfqController.prototype, "processPending", null);
exports.EmailRfqController = EmailRfqController = __decorate([
    (0, common_1.Controller)('internal/email-rfq'),
    (0, common_1.UseGuards)(internal_key_auth_guard_1.InternalKeyAuthGuard),
    __metadata("design:paramtypes", [email_rfq_service_1.EmailRfqService])
], EmailRfqController);
//# sourceMappingURL=email-rfq.controller.js.map