import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private server: Server | null = null;
  private wsConnectionCount = 0;

  setServer(server: Server) {
    this.server = server;
  }

  incrementConnections() {
    this.wsConnectionCount++;
  }

  decrementConnections() {
    this.wsConnectionCount = Math.max(0, this.wsConnectionCount - 1);
  }

  getConnectionCount(): number {
    return this.wsConnectionCount;
  }

  emitToTenant(tenantId: string, event: string, payload: unknown) {
    if (!this.server) {
      this.logger.warn(`EventsService: server not ready, cannot emit ${event}`);
      return;
    }
    this.server.to(`tenant:${tenantId}`).emit(event, payload);
  }

  emitSyncProgress(tenantId: string, progress: object) {
    this.emitToTenant(tenantId, 'sync.progress', progress);
  }
}
