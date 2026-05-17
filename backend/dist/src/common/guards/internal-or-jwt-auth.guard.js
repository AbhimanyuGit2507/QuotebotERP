"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalOrJwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
let InternalOrJwtAuthGuard = class InternalOrJwtAuthGuard {
    internalKey = process.env.N8N_SECRET || 'UNSET_N8N_SECRET';
    jwtAuthGuard = new jwt_auth_guard_1.JwtAuthGuard();
    async canActivate(context) {
        if (this.internalKey === 'UNSET_N8N_SECRET') {
            const canActivate = await this.jwtAuthGuard.canActivate(context);
            return Boolean(canActivate);
        }
        const request = context.switchToHttp().getRequest();
        const providedKey = request.headers['x-internal-key'];
        if (providedKey && providedKey === this.internalKey) {
            const tenantId = request.headers['x-tenant-id'] ||
                request.query.tenant_id;
            if (!tenantId) {
                throw new common_1.UnauthorizedException('Missing X-Tenant-ID header or tenant_id query param');
            }
            request.user = {
                id: 'internal-n8n',
                email: 'internal@n8n.local',
                name: 'Internal n8n Worker',
                role: 'system',
                permissions: ['*'],
                tenant_id: tenantId,
            };
            return true;
        }
        const canActivate = await this.jwtAuthGuard.canActivate(context);
        return Boolean(canActivate);
    }
};
exports.InternalOrJwtAuthGuard = InternalOrJwtAuthGuard;
exports.InternalOrJwtAuthGuard = InternalOrJwtAuthGuard = __decorate([
    (0, common_1.Injectable)()
], InternalOrJwtAuthGuard);
//# sourceMappingURL=internal-or-jwt-auth.guard.js.map