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
exports.AssistanceController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const assistance_service_1 = require("./assistance.service");
let AssistanceController = class AssistanceController {
    assistanceService;
    constructor(assistanceService) {
        this.assistanceService = assistanceService;
    }
    async list(req, status, type, assignedTo) {
        const tenantId = req.user?.tenant_id;
        return this.assistanceService.list(tenantId, {
            status,
            type,
            assigned_to: assignedTo,
        });
    }
    async getById(req, id) {
        const tenantId = req.user?.tenant_id;
        return this.assistanceService.getById(tenantId, id);
    }
    async assign(req, id, body) {
        const tenantId = req.user?.tenant_id;
        return this.assistanceService.assign(tenantId, id, body.user_id);
    }
    async resolve(req, id) {
        const tenantId = req.user?.tenant_id;
        const userId = req.user?.id;
        return this.assistanceService.resolve(tenantId, id, userId);
    }
};
exports.AssistanceController = AssistanceController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('type')),
    __param(3, (0, common_1.Query)('assigned_to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], AssistanceController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AssistanceController.prototype, "getById", null);
__decorate([
    (0, common_1.Patch)(':id/assign'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AssistanceController.prototype, "assign", null);
__decorate([
    (0, common_1.Patch)(':id/resolve'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AssistanceController.prototype, "resolve", null);
exports.AssistanceController = AssistanceController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('assistance-tickets'),
    __metadata("design:paramtypes", [assistance_service_1.AssistanceService])
], AssistanceController);
//# sourceMappingURL=assistance.controller.js.map