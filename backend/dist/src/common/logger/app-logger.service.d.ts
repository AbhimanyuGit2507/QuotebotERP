import { ConsoleLogger } from '@nestjs/common';
export declare class AppLoggerService extends ConsoleLogger {
    private formatLogEntry;
    log(message: any, context?: string): void;
    error(message: any, trace?: string, context?: string): void;
    warn(message: any, context?: string): void;
    debug(message: any, context?: string): void;
}
