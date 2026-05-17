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
exports.EmailTemplatesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const email_templates_service_1 = require("./email-templates.service");
const create_email_template_dto_1 = require("./dtos/create-email-template.dto");
const update_email_template_dto_1 = require("./dtos/update-email-template.dto");
const client_1 = require("@prisma/client");
let EmailTemplatesController = class EmailTemplatesController {
    emailTemplatesService;
    constructor(emailTemplatesService) {
        this.emailTemplatesService = emailTemplatesService;
    }
    async findAll(req) {
        const tenantId = req.user.tenant_id;
        return this.emailTemplatesService.findAll(tenantId);
    }
    async findByType(req, type) {
        const tenantId = req.user.tenant_id;
        return this.emailTemplatesService.findByType(tenantId, type);
    }
    getAvailableVariables(type) {
        return this.emailTemplatesService.getAvailableVariables(type);
    }
    async upsert(req, dto) {
        const tenantId = req.user.tenant_id;
        return this.emailTemplatesService.upsert(tenantId, dto);
    }
    async initializeDefaults(req) {
        const tenantId = req.user.tenant_id;
        return this.emailTemplatesService.initializeDefaultTemplates(tenantId);
    }
    async update(req, id, dto) {
        const tenantId = req.user.tenant_id;
        return this.emailTemplatesService.update(id, tenantId, dto);
    }
    async delete(req, id) {
        const tenantId = req.user.tenant_id;
        return this.emailTemplatesService.delete(id, tenantId);
    }
};
exports.EmailTemplatesController = EmailTemplatesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmailTemplatesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('by-type/:type'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], EmailTemplatesController.prototype, "findByType", null);
__decorate([
    (0, common_1.Get)('variables/:type'),
    __param(0, (0, common_1.Param)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EmailTemplatesController.prototype, "getAvailableVariables", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_email_template_dto_1.CreateEmailTemplateDto]),
    __metadata("design:returntype", Promise)
], EmailTemplatesController.prototype, "upsert", null);
__decorate([
    (0, common_1.Post)('initialize'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmailTemplatesController.prototype, "initializeDefaults", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_email_template_dto_1.UpdateEmailTemplateDto]),
    __metadata("design:returntype", Promise)
], EmailTemplatesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], EmailTemplatesController.prototype, "delete", null);
exports.EmailTemplatesController = EmailTemplatesController = __decorate([
    (0, common_1.Controller)('email-templates'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [email_templates_service_1.EmailTemplatesService])
], EmailTemplatesController);
//# sourceMappingURL=email-templates.controller.js.map