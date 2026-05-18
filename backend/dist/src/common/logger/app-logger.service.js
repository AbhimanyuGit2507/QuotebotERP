"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppLoggerService = void 0;
const common_1 = require("@nestjs/common");
let AppLoggerService = class AppLoggerService extends common_1.ConsoleLogger {
    formatLogEntry(level, message, context, trace) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message: typeof message === 'string' ? message : JSON.stringify(message),
        };
        if (context)
            entry.context = context;
        if (trace)
            entry.trace = trace;
        return JSON.stringify(entry);
    }
    log(message, context) {
        if (process.env.NODE_ENV === 'production') {
            process.stdout.write(this.formatLogEntry('info', message, context) + '\n');
        }
        else {
            super.log(message, context);
        }
    }
    error(message, trace, context) {
        if (process.env.NODE_ENV === 'production') {
            process.stderr.write(this.formatLogEntry('error', message, context, trace) + '\n');
        }
        else {
            super.error(message, trace, context);
        }
    }
    warn(message, context) {
        if (process.env.NODE_ENV === 'production') {
            process.stdout.write(this.formatLogEntry('warn', message, context) + '\n');
        }
        else {
            super.warn(message, context);
        }
    }
    debug(message, context) {
        if (process.env.NODE_ENV !== 'production') {
            super.debug(message, context);
        }
    }
};
exports.AppLoggerService = AppLoggerService;
exports.AppLoggerService = AppLoggerService = __decorate([
    (0, common_1.Injectable)({ scope: common_1.Scope.TRANSIENT })
], AppLoggerService);
//# sourceMappingURL=app-logger.service.js.map