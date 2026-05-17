import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class InternalKeyAuthGuard implements CanActivate {
    private readonly logger;
    private readonly internalKey;
    canActivate(context: ExecutionContext): boolean;
}
