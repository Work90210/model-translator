import { getRedis } from './redis.js';

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 100;

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetAt: number;
}

export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const redis = getRedis();
  const key = `ratelimit:api:${userId}`;
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  try {
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, '-inf', windowStart);
    pipeline.zcard(key);

    const results = await pipeline.exec();
    const count = (results?.[1]?.[1] as number) ?? 0;

    if (count >= MAX_REQUESTS) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: Math.ceil((now + WINDOW_MS) / 1000),
      };
    }

    await redis.zadd(key, now, `${now}:${Math.random().toString(36).slice(2, 8)}`);
    await redis.pexpire(key, WINDOW_MS);

    return {
      allowed: true,
      remaining: Math.max(0, MAX_REQUESTS - count - 1),
      resetAt: Math.ceil((now + WINDOW_MS) / 1000),
    };
  } catch {
    // Fail open if Redis is unavailable
    return { allowed: true, remaining: MAX_REQUESTS, resetAt: 0 };
  }
}
