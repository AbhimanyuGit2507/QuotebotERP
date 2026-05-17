import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      message: 'Quotebot Backend API is running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      status: 'healthy',
    };
  }
}
