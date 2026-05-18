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
exports.RfqsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const rfqs_service_1 = require("./rfqs.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const rfqs_query_dto_1 = require("./dtos/rfqs-query.dto");
const create_rfq_dto_1 = require("./dtos/create-rfq.dto");
const update_rfq_dto_1 = require("./dtos/update-rfq.dto");
const update_rfq_status_dto_1 = require("./dtos/update-rfq-status.dto");
const create_rfq_from_email_dto_1 = require("./dtos/create-rfq-from-email.dto");
const send_rfq_email_dto_1 = require("./dtos/send-rfq-email.dto");
let RfqsController = class RfqsController {
    rfqsService;
    constructor(rfqsService) {
        this.rfqsService = rfqsService;
    }
    findAll(user, query, page, pageSize, sortBy, sortOrder) {
        return this.rfqsService.findAll(user.tenant_id, {
            search: query.search,
            status: query.status,
            channel: query.channel,
            limit: query.limit,
            page: page ? Number(page) : undefined,
            pageSize: pageSize ? Number(pageSize) : undefined,
            sortBy,
            sortOrder: sortOrder,
        });
    }
    async exportCsv(user, query, res) {
        const csv = await this.rfqsService.exportCsv(user.tenant_id, {
            search: query.search,
            status: query.status,
            channel: query.channel,
            limit: query.limit,
        });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="rfqs-export.csv"');
        return res.send(csv);
    }
    findOne(id, user) {
        return this.rfqsService.findOne(id, user.tenant_id);
    }
    create(user, body) {
        return this.rfqsService.create(user.tenant_id, body);
    }
    createFromEmail(user, body) {
        return this.rfqsService.createFromEmail(user.tenant_id, body);
    }
    previewFromEmail(user, body) {
        return this.rfqsService.previewFromEmail(user.tenant_id, body);
    }
    update(id, user, body) {
        return this.rfqsService.update(id, user.tenant_id, body);
    }
    updateStatus(id, user, body) {
        return this.rfqsService.updateStatus(id, user.tenant_id, body.status);
    }
    convertToQuotation(id, user) {
        return this.rfqsService.convertToQuotation(id, user.tenant_id);
    }
    sendByEmail(id, user, body) {
        return this.rfqsService.sendByEmail(id, user.tenant_id, body);
    }
    remove(id, user, force, forceDelete) {
        const forceFlag = Boolean(force === 'true' || force === '1');
        if (forceDelete === 'true') {
            return this.rfqsService.forceDelete(id, user.tenant_id, {
                forceDeleteLinkedQuotation: forceFlag,
            });
        }
        return this.rfqsService.remove(id, user.tenant_id, {
            forceDeleteLinkedQuotation: forceFlag,
        });
    }
};
exports.RfqsController = RfqsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('pageSize')),
    __param(4, (0, common_1.Query)('sortBy')),
    __param(5, (0, common_1.Query)('sortOrder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, rfqs_query_dto_1.RfqsQueryDto, String, String, String, String]),
    __metadata("design:returntype", void 0)
], RfqsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('export/csv'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, rfqs_query_dto_1.RfqsQueryDto, Object]),
    __metadata("design:returntype", Promise)
], RfqsController.prototype, "exportCsv", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RfqsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_rfq_dto_1.CreateRfqDto]),
    __metadata("design:returntype", void 0)
], RfqsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('from-email'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_rfq_from_email_dto_1.CreateRfqFromEmailDto]),
    __metadata("design:returntype", void 0)
], RfqsController.prototype, "createFromEmail", null);
__decorate([
    (0, common_1.Post)('preview-from-email'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_rfq_from_email_dto_1.CreateRfqFromEmailDto]),
    __metadata("design:returntype", Promise)
], RfqsController.prototype, "previewFromEmail", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_rfq_dto_1.UpdateRfqDto]),
    __metadata("design:returntype", void 0)
], RfqsController.prototype, "update", null);
__decorate([
    (0, common_1.Put)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_rfq_status_dto_1.UpdateRfqStatusDto]),
    __metadata("design:returntype", void 0)
], RfqsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':id/convert-to-quotation'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RfqsController.prototype, "convertToQuotation", null);
__decorate([
    (0, common_1.Post)(':id/send-email'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, send_rfq_email_dto_1.SendRfqEmailDto]),
    __metadata("design:returntype", void 0)
], RfqsController.prototype, "sendByEmail", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)('forceDeleteLinkedQuotation')),
    __param(3, (0, common_1.Query)('forceDelete')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", void 0)
], RfqsController.prototype, "remove", null);
exports.RfqsController = RfqsController = __decorate([
    (0, swagger_1.ApiTags)('RFQs'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('rfqs'),
    __metadata("design:paramtypes", [rfqs_service_1.RfqsService])
], RfqsController);
//# sourceMappingURL=rfqs.controller.js.map