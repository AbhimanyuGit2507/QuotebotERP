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
exports.InboxController = void 0;
const common_1 = require("@nestjs/common");
const inbox_service_1 = require("./inbox.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const update_message_processing_status_dto_1 = require("./dtos/update-message-processing-status.dto");
const retry_message_dto_1 = require("./dtos/retry-message.dto");
const internal_or_jwt_auth_guard_1 = require("../common/guards/internal-or-jwt-auth.guard");
let InboxController = class InboxController {
    inboxService;
    constructor(inboxService) {
        this.inboxService = inboxService;
    }
    findMessages(user, processingStatus) {
        if (processingStatus) {
            return this.inboxService.findMessagesForProcessing(user.tenant_id, processingStatus);
        }
        return this.inboxService.findMessages(user.tenant_id);
    }
    updateMessageProcessingStatus(id, user, body) {
        return this.inboxService.updateMessageProcessingStatus(id, user.tenant_id, body);
    }
    retryMessageParsing(id, user, body) {
        return this.inboxService.retryMessageParsing(id, user.tenant_id, body);
    }
    retryRfqSourceMessage(rfqId, user, body) {
        return this.inboxService.retrySourceMessageByRfqId(rfqId, user.tenant_id, body);
    }
};
exports.InboxController = InboxController;
__decorate([
    (0, common_1.Get)('messages'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('processing_status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], InboxController.prototype, "findMessages", null);
__decorate([
    (0, common_1.Patch)('messages/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_message_processing_status_dto_1.UpdateMessageProcessingStatusDto]),
    __metadata("design:returntype", void 0)
], InboxController.prototype, "updateMessageProcessingStatus", null);
__decorate([
    (0, common_1.Post)('messages/:id/retry'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, retry_message_dto_1.RetryMessageDto]),
    __metadata("design:returntype", void 0)
], InboxController.prototype, "retryMessageParsing", null);
__decorate([
    (0, common_1.Post)('rfqs/:rfqId/retry'),
    __param(0, (0, common_1.Param)('rfqId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, retry_message_dto_1.RetryMessageDto]),
    __metadata("design:returntype", void 0)
], InboxController.prototype, "retryRfqSourceMessage", null);
exports.InboxController = InboxController = __decorate([
    (0, common_1.UseGuards)(internal_or_jwt_auth_guard_1.InternalOrJwtAuthGuard),
    (0, common_1.Controller)('inbox'),
    __metadata("design:paramtypes", [inbox_service_1.InboxService])
], InboxController);
//# sourceMappingURL=inbox.controller.js.map