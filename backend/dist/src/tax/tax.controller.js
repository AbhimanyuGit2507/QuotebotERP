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
exports.TaxController = void 0;
const common_1 = require("@nestjs/common");
const tax_service_1 = require("./tax.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const create_tax_profile_dto_1 = require("./dtos/create-tax-profile.dto");
const calculate_tax_dto_1 = require("./dtos/calculate-tax.dto");
let TaxController = class TaxController {
    taxService;
    constructor(taxService) {
        this.taxService = taxService;
    }
    findAll(user) {
        return this.taxService.findAll(user.tenant_id);
    }
    findOne(id, user) {
        return this.taxService.findOne(id, user.tenant_id);
    }
    create(user, dto) {
        return this.taxService.create(user.tenant_id, dto);
    }
    update(id, user, dto) {
        return this.taxService.update(id, user.tenant_id, dto);
    }
    remove(id, user) {
        return this.taxService.remove(id, user.tenant_id);
    }
    seedDefaults(user) {
        return this.taxService.seedDefaults(user.tenant_id);
    }
    calculate(user, dto) {
        return this.taxService.calculateTax(dto.amount, dto.tax_profile_id, user.tenant_id, dto.client_id);
    }
};
exports.TaxController = TaxController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TaxController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TaxController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_tax_profile_dto_1.CreateTaxProfileDto]),
    __metadata("design:returntype", void 0)
], TaxController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, create_tax_profile_dto_1.CreateTaxProfileDto]),
    __metadata("design:returntype", void 0)
], TaxController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TaxController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('seed-defaults'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TaxController.prototype, "seedDefaults", null);
__decorate([
    (0, common_1.Post)('calculate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, calculate_tax_dto_1.CalculateTaxDto]),
    __metadata("design:returntype", void 0)
], TaxController.prototype, "calculate", null);
exports.TaxController = TaxController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('tax-profiles'),
    __metadata("design:paramtypes", [tax_service_1.TaxService])
], TaxController);
//# sourceMappingURL=tax.controller.js.map