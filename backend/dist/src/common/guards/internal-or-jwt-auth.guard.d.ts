import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class InternalOrJwtAuthGuard implements CanActivate {
    private readonly internalKey;
    private readonly jwtAuthGuard;
    canActivate(context: ExecutionContext): Promise<boolean>;
}
