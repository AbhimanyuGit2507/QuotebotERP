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
var AuthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const login_dto_1 = require("./dtos/login.dto");
const register_dto_1 = require("./dtos/register.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
let AuthController = class AuthController {
    static { AuthController_1 = this; }
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    static accessCookieName = 'qb_access_token';
    static refreshCookieName = 'qb_refresh_token';
    async login(loginDto, res) {
        const session = await this.authService.login(loginDto);
        this.setAuthCookies(res, session);
        return { user: session.user };
    }
    async register(registerDto, res) {
        const session = await this.authService.register(registerDto);
        this.setAuthCookies(res, session);
        return { user: session.user };
    }
    googleAuth(redirectTo, source, res) {
        const authUrl = this.authService.getGoogleOAuthUrl(redirectTo, source ?? 'login');
        return res.redirect(authUrl);
    }
    async googleCallback(code, state, res) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        try {
            const result = await this.authService.handleGoogleOAuthCallback(code, state);
            const redirectTarget = result.redirectTo || '/dashboard';
            this.setAuthCookies(res, result);
            const callbackUrl = new URL('/auth/callback', frontendUrl);
            callbackUrl.searchParams.set('redirectTo', redirectTarget);
            return res.redirect(callbackUrl.toString());
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'OAuth error';
            const failureUrl = new URL('/login', frontendUrl);
            failureUrl.searchParams.set('error', message);
            return res.redirect(failureUrl.toString());
        }
    }
    validate() {
        return {
            message: 'Token is valid',
            timestamp: new Date().toISOString(),
        };
    }
    getMe(user) {
        return {
            user,
        };
    }
    async refresh(req, res) {
        const cookies = req.cookies;
        const refreshToken = cookies?.[AuthController_1.refreshCookieName];
        const refreshTokenValue = typeof refreshToken === 'string' ? refreshToken : undefined;
        if (!refreshTokenValue) {
            throw new common_1.UnauthorizedException('Missing refresh token');
        }
        const session = await this.authService.refreshSession(refreshTokenValue);
        this.setAuthCookies(res, session);
        return { user: session.user };
    }
    logout(res) {
        this.clearAuthCookies(res);
        return { message: 'Logged out' };
    }
    adminCheck(user) {
        return {
            message: 'Admin access granted',
            user,
        };
    }
    setAuthCookies(res, session) {
        res.cookie(AuthController_1.accessCookieName, session.access_token, this.getCookieOptions('access'));
        res.cookie(AuthController_1.refreshCookieName, session.refresh_token, this.getCookieOptions('refresh'));
    }
    clearAuthCookies(res) {
        res.clearCookie(AuthController_1.accessCookieName, this.getCookieOptions('access', true));
        res.clearCookie(AuthController_1.refreshCookieName, this.getCookieOptions('refresh', true));
    }
    getCookieOptions(type, omitMaxAge = false) {
        const baseMaxAge = type === 'access' ? 24 * 60 * 60 * 1000 : 14 * 24 * 60 * 60 * 1000;
        const duration = type === 'access'
            ? process.env.JWT_EXPIRATION || '24h'
            : process.env.JWT_REFRESH_EXPIRATION || '14d';
        const maxAge = this.parseDurationToMs(duration, baseMaxAge);
        const domain = process.env.AUTH_COOKIE_DOMAIN?.trim();
        const secureFlag = (process.env.AUTH_COOKIE_SECURE || '').toLowerCase() === 'true';
        const secure = secureFlag || process.env.NODE_ENV === 'production';
        const sameSite = (process.env.AUTH_COOKIE_SAMESITE || 'lax');
        return {
            httpOnly: true,
            secure,
            sameSite,
            path: '/',
            ...(domain ? { domain } : {}),
            ...(omitMaxAge ? {} : { maxAge }),
        };
    }
    parseDurationToMs(value, fallbackMs) {
        if (!value) {
            return fallbackMs;
        }
        if (/^\d+$/.test(value)) {
            return Number(value) * 1000;
        }
        const match = value.trim().match(/^(\d+)(ms|s|m|h|d)$/i);
        if (!match) {
            return fallbackMs;
        }
        const amount = Number(match[1]);
        const unit = match[2].toLowerCase();
        switch (unit) {
            case 'ms':
                return amount;
            case 's':
                return amount * 1000;
            case 'm':
                return amount * 60 * 1000;
            case 'h':
                return amount * 60 * 60 * 1000;
            case 'd':
                return amount * 24 * 60 * 60 * 1000;
            default:
                return fallbackMs;
        }
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Get)('google'),
    __param(0, (0, common_1.Query)('redirectTo')),
    __param(1, (0, common_1.Query)('source')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "googleAuth", null);
__decorate([
    (0, common_1.Get)('google/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleCallback", null);
__decorate([
    (0, common_1.Post)('validate'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "validate", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "getMe", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('admin-check'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "adminCheck", null);
exports.AuthController = AuthController = AuthController_1 = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map