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
exports.EmailIntegrationsController = void 0;
const common_1 = require("@nestjs/common");
const email_service_1 = require("./email.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let EmailIntegrationsController = class EmailIntegrationsController {
    emailService;
    constructor(emailService) {
        this.emailService = emailService;
    }
    async getEmailAccounts(req) {
        const userId = req.user?.id;
        const tenantId = req.user?.tenant_id;
        if (!userId || !tenantId) {
            throw new common_1.BadRequestException('User ID or Tenant ID not found');
        }
        return this.emailService.getUserEmailAccounts(tenantId, userId);
    }
    getSyncStatus(req) {
        const tenantId = req.user?.tenant_id;
        if (!tenantId) {
            throw new common_1.BadRequestException('Tenant ID not found');
        }
        return this.emailService.getGmailSyncStatus(tenantId);
    }
    triggerSyncNow(req) {
        const tenantId = req.user?.tenant_id;
        if (!tenantId) {
            throw new common_1.BadRequestException('Tenant ID not found');
        }
        return this.emailService.triggerImmediateGmailSync(tenantId);
    }
    clearInbox(req) {
        const tenantId = req.user?.tenant_id;
        if (!tenantId) {
            throw new common_1.BadRequestException('Tenant ID not found');
        }
        return this.emailService.clearInboxData(tenantId);
    }
    authorizeOAuth(req, res) {
        const userId = req.user?.id;
        const tenantId = req.user?.tenant_id;
        console.log('[Backend][OAuth] Authorize request received', {
            userId,
            tenantId,
            path: req.path,
            method: req.method,
        });
        if (!userId || !tenantId) {
            return res.status(400).json({
                error: 'User ID or Tenant ID not found',
            });
        }
        try {
            const state = Buffer.from(JSON.stringify({ userId, tenantId, timestamp: Date.now() })).toString('base64');
            const authUrl = this.emailService.initiateGoogleOAuth(state);
            console.log('[Backend][OAuth] Generated authorization URL successfully', {
                userId,
                tenantId,
            });
            return res.json({
                authorizationUrl: authUrl,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'OAuth error';
            console.error('[Backend][OAuth] Authorize request failed', {
                userId,
                tenantId,
                error: message,
            });
            return res.status(500).json({ error: message });
        }
    }
    async oauthCallback(code, state, req, res) {
        console.log('[Backend][OAuth] Callback received', {
            hasCode: Boolean(code),
            hasState: Boolean(state),
            path: req.path,
            method: req.method,
        });
        if (!code || !state) {
            return res.status(400).json({
                error: 'Missing authorization code or state',
            });
        }
        try {
            const statePayload = JSON.parse(Buffer.from(state, 'base64').toString());
            const userId = statePayload.userId;
            const tenantId = statePayload.tenantId;
            if (!userId || !tenantId) {
                console.error('[Backend][OAuth] Invalid callback state payload', {
                    statePayload,
                });
                return res.status(400).json({ error: 'Invalid state data' });
            }
            const emailAccount = await this.emailService.handleGoogleOAuthCallback(code, state, tenantId, userId);
            console.log('[Backend][OAuth] Callback completed and account linked', {
                userId,
                tenantId,
                email: emailAccount.email_address,
            });
            try {
                const syncResult = this.emailService.triggerImmediateGmailSync(tenantId);
                console.log('[Backend][OAuth] Immediate sync trigger result', {
                    tenantId,
                    started: syncResult.started,
                    reason: syncResult.reason,
                });
            }
            catch (syncError) {
                const syncMessage = syncError instanceof Error
                    ? syncError.message
                    : 'Unknown sync trigger error';
                console.error('[Backend][OAuth] Failed to trigger immediate sync', {
                    tenantId,
                    error: syncMessage,
                });
            }
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            return res.redirect(`${frontendUrl}/system-config?tab=communication&success=email_connected&email=${encodeURIComponent(emailAccount.email_address)}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'OAuth error';
            console.error('[Backend][OAuth] Callback failed', {
                error: message,
            });
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            return res.redirect(`${frontendUrl}/system-config?tab=communication&error=${encodeURIComponent(message)}`);
        }
    }
    async disconnectEmailAccount(accountId, req) {
        const userId = req.user?.id;
        const tenantId = req.user?.tenant_id;
        if (!userId || !tenantId) {
            throw new common_1.BadRequestException('User ID or Tenant ID not found');
        }
        return this.emailService.disconnectEmailAccount(accountId, tenantId, userId);
    }
};
exports.EmailIntegrationsController = EmailIntegrationsController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmailIntegrationsController.prototype, "getEmailAccounts", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('sync-status'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EmailIntegrationsController.prototype, "getSyncStatus", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('sync-now'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EmailIntegrationsController.prototype, "triggerSyncNow", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('clear-inbox'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EmailIntegrationsController.prototype, "clearInbox", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('oauth/authorize'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], EmailIntegrationsController.prototype, "authorizeOAuth", null);
__decorate([
    (0, common_1.Get)('oauth/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], EmailIntegrationsController.prototype, "oauthCallback", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EmailIntegrationsController.prototype, "disconnectEmailAccount", null);
exports.EmailIntegrationsController = EmailIntegrationsController = __decorate([
    (0, common_1.Controller)('email-integrations'),
    __metadata("design:paramtypes", [email_service_1.EmailService])
], EmailIntegrationsController);
//# sourceMappingURL=email-integrations.controller.js.map