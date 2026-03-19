export interface BaseEvent {
  readonly id: string;
  readonly serverId: string;
  readonly toolId: string | null;
  readonly userId: string;
  readonly statusCode: number;
  readonly durationMs: number;
  readonly timestamp: Date;
}
