import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit } from '../../lib/rate-limit.js';

vi.mock('../../lib/redis.js', () => {
  const pipelineResult = {
    zremrangebyscore: vi.fn().mockReturnThis(),
    zcard: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([
      [null, 0],
      [null, 5], // 5 requests in window
    ]),
  };

  const mockRedis = {
    pipeline: vi.fn().mockReturnValue(pipelineResult),
    zadd: vi.fn().mockResolvedValue(1),
    pexpire: vi.fn().mockResolvedValue(1),
    _pipelineResult: pipelineResult,
  };

  return {
    getRedis: vi.fn().mockReturnValue(mockRedis),
    _mockRedis: mockRedis,
  };
});

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows requests under the limit', async () => {
    const result = await checkRateLimit('user-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it('blocks requests at the limit', async () => {
    const { _mockRedis } = await import('../../lib/redis.js') as unknown as { _mockRedis: { _pipelineResult: { exec: ReturnType<typeof vi.fn> } } };
    _mockRedis._pipelineResult.exec.mockResolvedValue([
      [null, 0],
      [null, 100], // at limit
    ]);

    const result = await checkRateLimit('user-1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('fails open on Redis error', async () => {
    const { _mockRedis } = await import('../../lib/redis.js') as unknown as { _mockRedis: { pipeline: ReturnType<typeof vi.fn> } };
    _mockRedis.pipeline.mockImplementation(() => ({
      zremrangebyscore: vi.fn().mockReturnThis(),
      zcard: vi.fn().mockReturnThis(),
      exec: vi.fn().mockRejectedValue(new Error('Redis down')),
    }));

    const result = await checkRateLimit('user-1');
    expect(result.allowed).toBe(true);
  });
});
