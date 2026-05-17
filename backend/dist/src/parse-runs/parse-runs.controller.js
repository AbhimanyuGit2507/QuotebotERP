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
exports.ParseRunsController = void 0;
const common_1 = require("@nestjs/common");
const internal_key_auth_guard_1 = require("../common/guards/internal-key-auth.guard");
const parse_runs_service_1 = require("./parse-runs.service");
let ParseRunsController = class ParseRunsController {
    parseRunsService;
    constructor(parseRunsService) {
        this.parseRunsService = parseRunsService;
    }
    getTenantId(req) {
        const tenantId = req['tenantId'];
        if (!tenantId) {
            throw new common_1.BadRequestException('Tenant ID not found in request');
        }
        return tenantId;
    }
    findAll(req, stage, status, messageId, source, limit) {
        return this.parseRunsService.findAll(this.getTenantId(req), {
            stage,
            status,
            message_id: messageId,
            source,
            limit: limit ? Number(limit) : undefined,
        });
    }
    summary(req, lookbackDays) {
        return this.parseRunsService.summary(this.getTenantId(req), lookbackDays ? Number(lookbackDays) : undefined);
    }
    cleanup(req, body) {
        return this.parseRunsService.cleanupOldRuns(this.getTenantId(req), body?.keep_days);
    }
};
exports.ParseRunsController = ParseRunsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('stage')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('message_id')),
    __param(4, (0, common_1.Query)('source')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ParseRunsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('summary'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('lookback_days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ParseRunsController.prototype, "summary", null);
__decorate([
    (0, common_1.Post)('cleanup'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ParseRunsController.prototype, "cleanup", null);
exports.ParseRunsController = ParseRunsController = __decorate([
    (0, common_1.UseGuards)(internal_key_auth_guard_1.InternalKeyAuthGuard),
    (0, common_1.Controller)('internal/parse-runs'),
    __metadata("design:paramtypes", [parse_runs_service_1.ParseRunsService])
], ParseRunsController);
//# sourceMappingURL=parse-runs.controller.js.map