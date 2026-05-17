"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var InternalKeyAuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalKeyAuthGuard = void 0;
const common_1 = require("@nestjs/common");
let InternalKeyAuthGuard = InternalKeyAuthGuard_1 = class InternalKeyAuthGuard {
    logger = new common_1.Logger(InternalKeyAuthGuard_1.name);
    internalKey = process.env.INTERNAL_API_KEY || 'UNSET_INTERNAL_API_KEY';
    canActivate(context) {
        if (this.internalKey === 'UNSET_INTERNAL_API_KEY') {
            this.logger.error('INTERNAL_API_KEY is not configured. Internal endpoints are disabled until it is set.');
            throw new common_1.UnauthorizedException('Internal integration key is not configured');
        }
        const request = context.switchToHttp().getRequest();
        const providedKey = request.headers['x-internal-key'];
        if (!providedKey || providedKey !== this.internalKey) {
            this.logger.warn(`Invalid X-Internal-Key attempt from ${request.ip}`);
            throw new common_1.UnauthorizedException('Invalid X-Internal-Key header');
        }
        const tenantId = request.headers['x-tenant-id'] ||
            request.query.tenant_id;
        if (tenantId) {
            request['tenantId'] = tenantId;
        }
        return true;
    }
};
exports.InternalKeyAuthGuard = InternalKeyAuthGuard;
exports.InternalKeyAuthGuard = InternalKeyAuthGuard = InternalKeyAuthGuard_1 = __decorate([
    (0, common_1.Injectable)()
], InternalKeyAuthGuard);
//# sourceMappingURL=internal-key-auth.guard.js.map