import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
type AuthRequest = Omit<Request, 'cookies'> & {
    cookies?: Record<string, string | undefined>;
};
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    private static readonly accessCookieName;
    private static readonly refreshCookieName;
    login(loginDto: LoginDto, res: Response): Promise<{
        user: {
            id: string;
            email: string;
            name: string;
            tenant_id: string;
            role: string;
            company_name?: string;
        };
    }>;
    register(registerDto: RegisterDto, res: Response): Promise<{
        user: {
            id: string;
            email: string;
            name: string;
            tenant_id: string;
            role: string;
            company_name?: string;
        };
    }>;
    googleAuth(redirectTo: string | undefined, source: 'login' | 'signup' | undefined, res: Response): void;
    googleCallback(code: string, state: string, res: Response): Promise<void>;
    validate(): {
        message: string;
        timestamp: string;
    };
    getMe(user: AuthenticatedUser): {
        user: AuthenticatedUser;
    };
    refresh(req: AuthRequest, res: Response): Promise<{
        user: {
            id: string;
            email: string;
            name: string;
            tenant_id: string;
            role: string;
            company_name?: string;
        };
    }>;
    logout(res: Response): {
        message: string;
    };
    adminCheck(user: AuthenticatedUser): {
        message: string;
        user: AuthenticatedUser;
    };
    private setAuthCookies;
    private clearAuthCookies;
    private getCookieOptions;
    private parseDurationToMs;
}
export {};
