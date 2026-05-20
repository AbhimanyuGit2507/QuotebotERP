import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';
import { EventsService } from './events.service';

interface JwtPayload {
  sub: string;
  email: string;
  tenant_id: string;
  role: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/events',
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly eventsService: EventsService) {}

  afterInit(server: Server) {
    this.eventsService.setServer(server);
    this.logger.log('✓ WebSocket Events Gateway initialized at /events');
  }

  handleConnection(client: Socket) {
    try {
      const authToken = (client.handshake.auth as Record<string, unknown>)
        ?.token;
      const queryToken = (client.handshake.query as Record<string, unknown>)
        ?.token;
      const rawToken = authToken || queryToken;
      const tokenStr = typeof rawToken === 'string' ? rawToken : undefined;

      if (!tokenStr) {
        this.logger.warn(
          `Client ${client.id} connected without token — disconnecting`,
        );
        client.disconnect(true);
        return;
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        client.disconnect(true);
        return;
      }

      const payload = verify(tokenStr, secret) as unknown as JwtPayload;
      client.data.tenantId = payload.tenant_id;
      client.data.userId = payload.sub;

      void client.join(`tenant:${payload.tenant_id}`);
      this.eventsService.incrementConnections();
      this.logger.log(`Client ${client.id} joined tenant:${payload.tenant_id}`);
    } catch (err) {
      this.logger.warn(
        `Client ${client.id} auth failed: ${(err as Error).message}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.eventsService.decrementConnections();
    this.logger.log(`Client ${client.id} disconnected`);
  }
}
