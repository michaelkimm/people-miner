import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
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
export declare class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private readonly logger;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    sendProgress(progress: JobProgress): void;
    sendCandidateUpdate(candidate: {
        id: string;
        githubUsername: string;
    }): void;
}
