import { ConsoleLogger, Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class AppLoggerService extends ConsoleLogger {
  private formatLogEntry(
    level: string,
    message: any,
    context?: string,
    trace?: string,
  ) {
    const entry: Record<string, any> = {
      timestamp: new Date().toISOString(),
      level,
      message: typeof message === 'string' ? message : JSON.stringify(message),
    };
    if (context) entry.context = context;
    if (trace) entry.trace = trace;
    return JSON.stringify(entry);
  }

  log(message: any, context?: string) {
    if (process.env.NODE_ENV === 'production') {
      process.stdout.write(
        this.formatLogEntry('info', message, context) + '\n',
      );
    } else {
      super.log(message, context);
    }
  }

  error(message: any, trace?: string, context?: string) {
    if (process.env.NODE_ENV === 'production') {
      process.stderr.write(
        this.formatLogEntry('error', message, context, trace) + '\n',
      );
    } else {
      super.error(message, trace, context);
    }
  }

  warn(message: any, context?: string) {
    if (process.env.NODE_ENV === 'production') {
      process.stdout.write(
        this.formatLogEntry('warn', message, context) + '\n',
      );
    } else {
      super.warn(message, context);
    }
  }

  debug(message: any, context?: string) {
    if (process.env.NODE_ENV !== 'production') {
      super.debug(message, context);
    }
  }
}
