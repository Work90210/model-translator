import type { BaseEvent } from './base-event.js';

export interface UsageEvent extends BaseEvent {
  readonly errorCode: string | null;
}

export interface CreateUsageEventInput {
  readonly serverId: string;
  readonly toolId?: string | null;
  readonly durationMs: number;
  readonly statusCode: number;
  readonly errorCode?: string | null;
}
