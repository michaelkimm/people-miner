import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

export interface JobProgress {
  jobId: string;
  source?: string;
  status: 'processing' | 'completed' | 'error' | 'finished' | 'scored' | 'scoring';
  message: string;
  found?: number;
  new?: number;
  error?: string;
  candidateId?: string;
  score?: number;
  scored?: number;
  failed?: number;
  progress?: number;
}

export type CrawlProgress = JobProgress;

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  sendProgress(progress: JobProgress) {
    this.server.emit('crawl-progress', progress);
  }

  sendCandidateUpdate(candidate: { id: string; githubUsername: string }) {
    this.server.emit('candidate-update', candidate);
  }
}
