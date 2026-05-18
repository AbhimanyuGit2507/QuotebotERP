import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';

@SkipThrottle()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * GET /api
   * Health check endpoint
   */
  @Get()
  getHealth() {
    return this.appService.getHealth();
  }

  /**
   * GET /api/health
   * Detailed health check with database connectivity
   */
  @Get('health')
  getDetailedHealth() {
    return {
      ...this.appService.getHealth(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * GET /api/docs
   * API Documentation endpoint
   */
  @Get('docs')
  getDocs() {
    const apiPrefix = process.env.API_PREFIX || 'api';
    return {
      message: 'Quotebot Backend API Documentation',
      version: '1.0.0',
      baseUrl: process.env.PUBLIC_API_URL || `/${apiPrefix}`,
      endpoints: {
        auth: {
          login: 'POST /api/auth/login',
          register: 'POST /api/auth/register',
          validate: 'POST /api/auth/validate',
        },
        health: {
          health: 'GET /api/health',
          root: 'GET /api',
        },
      },
    };
  }
}
