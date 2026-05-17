import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';
export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    user: {
        id: string;
        email: string;
        name: string;
        tenant_id: string;
        role: string;
        company_name?: string;
    };
}
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    login(loginDto: LoginDto): Promise<AuthResponse>;
    register(registerDto: RegisterDto): Promise<AuthResponse>;
    getGoogleOAuthUrl(redirectTo?: string, source?: 'login' | 'signup'): string;
    handleGoogleOAuthCallback(code: string, state: string): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            email: string;
            name: string;
            tenant_id: string;
            role: string;
            company_name: string;
        };
        redirectTo: string | undefined;
    }>;
    refreshSession(refreshToken: string): Promise<AuthResponse>;
    validateToken(payload: {
        sub: string;
        email: string;
        tenant_id: string;
        role: string;
    }): Promise<{
        role: {
            name: string;
            id: string;
            permissions_json: string;
            created_at: Date;
        };
        tenant: {
            id: string;
            created_at: Date;
            company_name: string;
            trading_name: string | null;
            plan: string;
            updated_at: Date;
        };
    } & {
        name: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        email: string;
        tenant_id: string;
        password_hash: string;
        role_id: string;
        status: string;
        permissions: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    validateUser(email: string, password: string): Promise<({
        role: {
            name: string;
            id: string;
            permissions_json: string;
            created_at: Date;
        };
        tenant: {
            id: string;
            created_at: Date;
            company_name: string;
            trading_name: string | null;
            plan: string;
            updated_at: Date;
        };
    } & {
        name: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        email: string;
        tenant_id: string;
        password_hash: string;
        role_id: string;
        status: string;
        permissions: import("@prisma/client/runtime/client").JsonValue | null;
    }) | null>;
    private buildAuthResponse;
    private signAccessToken;
    private signRefreshToken;
    private verifyRefreshToken;
    private getAccessSecret;
    private getAccessExpiration;
    private getRefreshSecret;
    private getRefreshExpiration;
    private resolveGoogleOAuthCredentials;
    private decodeGoogleOAuthState;
    private resolveGoogleDisplayName;
    private findOrCreateGoogleUser;
    private createUniqueTenantName;
    private slugToTitleCase;
}
