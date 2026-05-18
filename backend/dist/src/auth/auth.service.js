"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcryptjs"));
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma.service");
let AuthService = class AuthService {
    prisma;
    jwtService;
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async login(loginDto) {
        const { email, password } = loginDto;
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: {
                role: true,
                tenant: true,
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        if (user.status !== 'active') {
            throw new common_1.UnauthorizedException('User account is inactive');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        return this.buildAuthResponse(user);
    }
    async register(registerDto) {
        const { tenant_id, email, name, password } = registerDto;
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            throw new common_1.BadRequestException('User with this email already exists');
        }
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenant_id },
        });
        if (!tenant) {
            throw new common_1.BadRequestException('Invalid tenant ID');
        }
        if (!tenant.allow_public_registration) {
            throw new common_1.BadRequestException('Public registration is disabled for this tenant');
        }
        const userRole = await this.prisma.role.findUnique({
            where: { name: 'user' },
        });
        if (!userRole) {
            throw new common_1.BadRequestException('Default user role not found');
        }
        const password_hash = await bcrypt.hash(password, 10);
        const newUser = await this.prisma.user.create({
            data: {
                tenant_id,
                email,
                name,
                password_hash,
                role_id: userRole.id,
                status: 'active',
            },
            include: {
                role: true,
                tenant: true,
            },
        });
        return this.buildAuthResponse(newUser);
    }
    getGoogleOAuthUrl(redirectTo, source = 'login') {
        const { clientId, redirectUri } = this.resolveGoogleOAuthCredentials();
        const state = {
            redirectTo,
            source,
            timestamp: Date.now(),
        };
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: ['openid', 'email', 'profile'].join(' '),
            state: Buffer.from(JSON.stringify(state)).toString('base64url'),
            access_type: 'offline',
            prompt: 'consent select_account',
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }
    async handleGoogleOAuthCallback(code, state) {
        const { redirectTo } = this.decodeGoogleOAuthState(state);
        const { clientId, clientSecret, redirectUri } = this.resolveGoogleOAuthCredentials();
        const tokenBody = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
        });
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: tokenBody,
        });
        const tokenPayload = await tokenResponse.json();
        if (!tokenResponse.ok) {
            const errorMessage = typeof tokenPayload === 'object' && tokenPayload !== null
                ? JSON.stringify(tokenPayload)
                : 'Unknown error';
            throw new common_1.BadRequestException(`Google token exchange failed (${tokenResponse.status}): ${errorMessage}`);
        }
        if (!tokenPayload || typeof tokenPayload !== 'object') {
            throw new common_1.BadRequestException('Invalid Google token response');
        }
        const tokens = tokenPayload;
        const accessToken = tokens.access_token;
        if (typeof accessToken !== 'string' || !accessToken.trim()) {
            throw new common_1.BadRequestException('Missing Google access token');
        }
        const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        const profilePayload = await profileResponse.json();
        if (!profileResponse.ok) {
            const errorMessage = typeof profilePayload === 'object' && profilePayload !== null
                ? JSON.stringify(profilePayload)
                : 'Unknown error';
            throw new common_1.BadRequestException(`Google profile lookup failed (${profileResponse.status}): ${errorMessage}`);
        }
        if (!profilePayload || typeof profilePayload !== 'object') {
            throw new common_1.BadRequestException('Invalid Google profile response');
        }
        const profile = profilePayload;
        const email = profile.email?.trim().toLowerCase();
        const name = this.resolveGoogleDisplayName(profile);
        if (!email) {
            throw new common_1.BadRequestException('Google account email was not returned');
        }
        const user = await this.findOrCreateGoogleUser({
            email,
            name,
        });
        const session = this.buildAuthResponse(user);
        return {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                tenant_id: user.tenant_id,
                role: user.role.name,
                company_name: user.tenant.company_name,
            },
            redirectTo,
        };
    }
    async refreshSession(refreshToken) {
        const payload = this.verifyRefreshToken(refreshToken);
        const user = await this.validateToken({
            sub: payload.sub,
            email: payload.email,
            tenant_id: payload.tenant_id,
            role: payload.role,
        });
        return this.buildAuthResponse(user);
    }
    async validateToken(payload) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            include: {
                role: true,
                tenant: true,
            },
        });
        if (!user || user.status !== 'active') {
            throw new common_1.UnauthorizedException('User not found or inactive');
        }
        return user;
    }
    async validateUser(email, password) {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: {
                role: true,
                tenant: true,
            },
        });
        if (!user) {
            return null;
        }
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return null;
        }
        return user;
    }
    buildAuthResponse(user) {
        const accessToken = this.signAccessToken(user);
        const refreshToken = this.signRefreshToken(user);
        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                tenant_id: user.tenant_id,
                role: user.role.name,
                company_name: user.tenant.company_name,
            },
        };
    }
    signAccessToken(user) {
        return this.jwtService.sign({
            sub: user.id,
            email: user.email,
            tenant_id: user.tenant_id,
            role: user.role.name,
        }, {
            secret: this.getAccessSecret(),
            expiresIn: this.getAccessExpiration(),
        });
    }
    signRefreshToken(user) {
        return this.jwtService.sign({
            sub: user.id,
            email: user.email,
            tenant_id: user.tenant_id,
            role: user.role.name,
            token_type: 'refresh',
        }, {
            secret: this.getRefreshSecret(),
            expiresIn: this.getRefreshExpiration(),
        });
    }
    verifyRefreshToken(token) {
        try {
            const raw = this.jwtService.verify(token, {
                secret: this.getRefreshSecret(),
            });
            if (!raw || raw.token_type !== 'refresh') {
                throw new common_1.UnauthorizedException('Invalid refresh token');
            }
            const sub = typeof raw.sub === 'string' ? raw.sub : undefined;
            const email = typeof raw.email === 'string' ? raw.email : undefined;
            const tenant_id = typeof raw.tenant_id === 'string' ? raw.tenant_id : undefined;
            const role = typeof raw.role === 'string' ? raw.role : undefined;
            if (!sub || !email || !tenant_id || !role) {
                throw new common_1.UnauthorizedException('Invalid refresh token payload');
            }
            return {
                sub,
                email,
                tenant_id,
                role,
                token_type: raw.token_type,
            };
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    getAccessSecret() {
        return process.env.JWT_SECRET || 'your-secret-key';
    }
    getAccessExpiration() {
        return process.env.JWT_EXPIRATION || '24h';
    }
    getRefreshSecret() {
        return process.env.JWT_REFRESH_SECRET || this.getAccessSecret();
    }
    getRefreshExpiration() {
        return process.env.JWT_REFRESH_EXPIRATION || '14d';
    }
    resolveGoogleOAuthCredentials() {
        const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI ||
            process.env.GOOGLE_OAUTH_REDIRECT_URI ||
            'http://localhost:3001/api/auth/google/callback';
        if (!clientId || !clientSecret) {
            throw new common_1.BadRequestException('Google OAuth credentials are not configured');
        }
        return { clientId, clientSecret, redirectUri };
    }
    decodeGoogleOAuthState(state) {
        if (!state) {
            return { redirectTo: undefined };
        }
        try {
            const payload = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
            return {
                redirectTo: typeof payload.redirectTo === 'string'
                    ? payload.redirectTo
                    : undefined,
            };
        }
        catch {
            return { redirectTo: undefined };
        }
    }
    resolveGoogleDisplayName(profile) {
        const candidate = profile.name?.trim() ||
            [profile.given_name, profile.family_name]
                .filter(Boolean)
                .join(' ')
                .trim();
        if (candidate) {
            return candidate;
        }
        return profile.email?.split('@')[0] ?? 'Google User';
    }
    async findOrCreateGoogleUser({ email, name, }) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
            include: {
                role: true,
                tenant: true,
            },
        });
        if (existingUser) {
            if (existingUser.status !== 'active') {
                throw new common_1.UnauthorizedException('User account is inactive');
            }
            return existingUser;
        }
        const userRole = await this.prisma.role.findUnique({
            where: { name: 'user' },
        });
        if (!userRole) {
            throw new common_1.BadRequestException('Default user role not found');
        }
        const tenantName = await this.createUniqueTenantName(name, email);
        const tenant = await this.prisma.tenant.create({
            data: {
                company_name: tenantName,
            },
        });
        const passwordHash = await bcrypt.hash((0, crypto_1.randomBytes)(32).toString('hex'), 10);
        return this.prisma.user.create({
            data: {
                tenant_id: tenant.id,
                email,
                name,
                password_hash: passwordHash,
                role_id: userRole.id,
                status: 'active',
            },
            include: {
                role: true,
                tenant: true,
            },
        });
    }
    async createUniqueTenantName(name, email) {
        const baseLabel = this.slugToTitleCase(name || email.split('@')[0] || 'Google User');
        let candidate = `${baseLabel} Workspace`;
        let suffix = 2;
        while (await this.prisma.tenant.findUnique({
            where: { company_name: candidate },
        })) {
            candidate = `${baseLabel} Workspace ${suffix}`;
            suffix += 1;
        }
        return candidate;
    }
    slugToTitleCase(value) {
        return value
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\b\w/g, (character) => character.toUpperCase());
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map