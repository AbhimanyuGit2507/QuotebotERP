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
exports.SettingsController = void 0;
const common_1 = require("@nestjs/common");
const settings_service_1 = require("./settings.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const update_company_settings_dto_1 = require("./dtos/update-company-settings.dto");
const update_notification_settings_dto_1 = require("./dtos/update-notification-settings.dto");
const create_template_dto_1 = require("./dtos/create-template.dto");
const update_template_dto_1 = require("./dtos/update-template.dto");
const create_automation_rule_dto_1 = require("./dtos/create-automation-rule.dto");
const update_automation_rule_dto_1 = require("./dtos/update-automation-rule.dto");
let SettingsController = class SettingsController {
    settingsService;
    constructor(settingsService) {
        this.settingsService = settingsService;
    }
    getCompany(user) {
        return this.settingsService.getCompany(user.tenant_id);
    }
    updateCompany(user, body) {
        return this.settingsService.updateCompany(user.tenant_id, body);
    }
    getNotifications(user) {
        return this.settingsService.getNotifications(user.tenant_id);
    }
    updateNotifications(user, body) {
        return this.settingsService.updateNotifications(user.tenant_id, body);
    }
    getTemplates(user) {
        return this.settingsService.getTemplates(user.tenant_id);
    }
    createTemplate(user, body) {
        return this.settingsService.createTemplate(user.tenant_id, body);
    }
    updateTemplate(id, user, body) {
        return this.settingsService.updateTemplate(id, user.tenant_id, body);
    }
    deleteTemplate(id, user) {
        return this.settingsService.deleteTemplate(id, user.tenant_id);
    }
    getAutomationRules(user) {
        return this.settingsService.getAutomationRules(user.tenant_id);
    }
    createAutomationRule(user, body) {
        return this.settingsService.createAutomationRule(user.tenant_id, body);
    }
    updateAutomationRule(id, user, body) {
        return this.settingsService.updateAutomationRule(id, user.tenant_id, body);
    }
    deleteAutomationRule(id, user) {
        return this.settingsService.deleteAutomationRule(id, user.tenant_id);
    }
};
exports.SettingsController = SettingsController;
__decorate([
    (0, common_1.Get)('company'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "getCompany", null);
__decorate([
    (0, common_1.Put)('company'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_company_settings_dto_1.UpdateCompanySettingsDto]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "updateCompany", null);
__decorate([
    (0, common_1.Get)('notifications'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "getNotifications", null);
__decorate([
    (0, common_1.Put)('notifications'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_notification_settings_dto_1.UpdateNotificationSettingsDto]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "updateNotifications", null);
__decorate([
    (0, common_1.Get)('templates'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "getTemplates", null);
__decorate([
    (0, common_1.Post)('templates'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_template_dto_1.CreateTemplateDto]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "createTemplate", null);
__decorate([
    (0, common_1.Put)('templates/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_template_dto_1.UpdateTemplateDto]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "updateTemplate", null);
__decorate([
    (0, common_1.Delete)('templates/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "deleteTemplate", null);
__decorate([
    (0, common_1.Get)('automation-rules'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "getAutomationRules", null);
__decorate([
    (0, common_1.Post)('automation-rules'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_automation_rule_dto_1.CreateAutomationRuleDto]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "createAutomationRule", null);
__decorate([
    (0, common_1.Put)('automation-rules/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_automation_rule_dto_1.UpdateAutomationRuleDto]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "updateAutomationRule", null);
__decorate([
    (0, common_1.Delete)('automation-rules/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "deleteAutomationRule", null);
exports.SettingsController = SettingsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('settings'),
    __metadata("design:paramtypes", [settings_service_1.SettingsService])
], SettingsController);
//# sourceMappingURL=settings.controller.js.map