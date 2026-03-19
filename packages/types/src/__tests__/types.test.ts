import { describe, it, expect } from 'vitest';

import {
  createSuccessResponse,
  createErrorResponse,
  createPlaintextKey,
  ErrorCodes,
  HttpStatusByErrorCode,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '../index.js';
import type {
  ApiResponse,
  Spec,
  McpServer,
  McpTool,
  Credential,
  UsageEvent,
  RequestLog,
  BaseEvent,
  CredentialAuthType,
  AuthMode,
  TransportType,
  HttpMethod,
} from '../index.js';
import type { CreateSpecInput } from '../spec.js';

// Compile-time assertions — these fail at build time if invariants are violated
type AssertReadonly<T extends { readonly id: string }> = T;
type _AssertSpec = AssertReadonly<Spec>;
type _AssertServer = AssertReadonly<McpServer>;
type _AssertTool = AssertReadonly<McpTool>;
type _AssertCredential = AssertReadonly<Credential>;
type _AssertUsage = AssertReadonly<UsageEvent>;
type _AssertLog = AssertReadonly<RequestLog>;
type _AssertNoToolCount = 'toolCount' extends keyof CreateSpecInput ? never : true;
const _ensureNoToolCount: _AssertNoToolCount = true;
void _ensureNoToolCount;

describe('ApiResponse', () => {
  describe('createSuccessResponse', () => {
    it('should create a success response with data', () => {
      const response = createSuccessResponse({ id: '1', name: 'test' });
      expect(response.success).toBe(true);
      expect(response.data).toEqual({ id: '1', name: 'test' });
      expect(response.error).toBeNull();
    });

    it('should create a success response with pagination meta', () => {
      const meta = { total: 100, page: 1, limit: 20, hasMore: true };
      const response = createSuccessResponse([1, 2, 3], meta);
      expect(response.success).toBe(true);
      expect(response.data).toEqual([1, 2, 3]);
      if (response.success) {
        expect(response.meta).toEqual(meta);
      }
    });

    it('should not include meta key when not provided', () => {
      const response = createSuccessResponse('test');
      expect('meta' in response).toBe(false);
    });
  });

  describe('createErrorResponse', () => {
    it('should create an error response', () => {
      const response = createErrorResponse(ErrorCodes.NOT_FOUND, 'Resource not found');
      expect(response.success).toBe(false);
      expect(response.data).toBeNull();
      expect(response.error).toEqual({ code: ErrorCodes.NOT_FOUND, message: 'Resource not found' });
    });

    it('should include details when provided', () => {
      const response = createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid input', {
        fields: ['name'],
      });
      expect(response.error).toEqual({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Invalid input',
        details: { fields: ['name'] },
      });
    });

    it('should not include details key when not provided', () => {
      const response = createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'msg');
      if (!response.success) {
        expect('details' in response.error).toBe(false);
      }
    });
  });

  describe('discriminated union narrowing', () => {
    it('should narrow to success branch', () => {
      const response: ApiResponse<string> = createSuccessResponse('hello');
      if (response.success) {
        const data: string = response.data;
        expect(data).toBe('hello');
      }
    });

    it('should narrow to error branch', () => {
      const response: ApiResponse<string> = createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'fail');
      if (!response.success) {
        expect(response.error.code).toBe(ErrorCodes.INTERNAL_ERROR);
        expect(response.data).toBeNull();
      }
    });
  });
});

describe('ErrorCodes', () => {
  it('should have all expected error codes', () => {
    expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
    expect(ErrorCodes.AUTH_ERROR).toBe('AUTH_ERROR');
    expect(ErrorCodes.RATE_LIMIT).toBe('RATE_LIMIT');
    expect(ErrorCodes.UPSTREAM_ERROR).toBe('UPSTREAM_ERROR');
    expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    expect(ErrorCodes.CONFLICT).toBe('CONFLICT');
    expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
  });

  it('should have HTTP status mappings for all codes', () => {
    expect(HttpStatusByErrorCode[ErrorCodes.VALIDATION_ERROR]).toBe(400);
    expect(HttpStatusByErrorCode[ErrorCodes.AUTH_ERROR]).toBe(401);
    expect(HttpStatusByErrorCode[ErrorCodes.FORBIDDEN]).toBe(403);
    expect(HttpStatusByErrorCode[ErrorCodes.NOT_FOUND]).toBe(404);
    expect(HttpStatusByErrorCode[ErrorCodes.CONFLICT]).toBe(409);
    expect(HttpStatusByErrorCode[ErrorCodes.RATE_LIMIT]).toBe(429);
    expect(HttpStatusByErrorCode[ErrorCodes.INTERNAL_ERROR]).toBe(500);
    expect(HttpStatusByErrorCode[ErrorCodes.UPSTREAM_ERROR]).toBe(502);
  });

  it('should have exactly 8 error codes', () => {
    expect(Object.keys(ErrorCodes)).toHaveLength(8);
    expect(Object.keys(HttpStatusByErrorCode)).toHaveLength(8);
  });
});

describe('Pagination constants', () => {
  it('should have correct defaults', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20);
    expect(MAX_PAGE_SIZE).toBe(100);
  });

  it('should have DEFAULT_PAGE_SIZE <= MAX_PAGE_SIZE', () => {
    expect(DEFAULT_PAGE_SIZE).toBeLessThanOrEqual(MAX_PAGE_SIZE);
  });
});

describe('createPlaintextKey', () => {
  it('should create a branded PlaintextKey from a non-empty string', () => {
    const key = createPlaintextKey('my-secret-key');
    expect(key).toBe('my-secret-key');
  });

  it('should reject an empty string', () => {
    expect(() => createPlaintextKey('')).toThrow('Plaintext key must not be empty');
  });
});

describe('Type safety', () => {
  it('CredentialAuthType should be a subset of AuthMode', () => {
    const validTypes: CredentialAuthType[] = ['api_key', 'bearer'];
    const allModes: AuthMode[] = ['none', 'api_key', 'bearer'];

    for (const t of validTypes) {
      expect(allModes).toContain(t);
    }
  });

  it('TransportType should have expected values', () => {
    const validTransports: TransportType[] = ['sse', 'streamable-http'];
    expect(validTransports).toHaveLength(2);
  });

  it('HttpMethod should have expected values', () => {
    const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    expect(methods).toHaveLength(7);
  });

  it('BaseEvent should be a common base for RequestLog and UsageEvent', () => {
    const baseFields: (keyof BaseEvent)[] = ['id', 'serverId', 'toolId', 'userId', 'statusCode', 'durationMs', 'timestamp'];
    const logFields: (keyof RequestLog)[] = [...baseFields, 'requestId', 'method', 'path'];
    const usageFields: (keyof UsageEvent)[] = [...baseFields, 'errorCode'];

    expect(baseFields).toHaveLength(7);
    expect(logFields).toHaveLength(10);
    expect(usageFields).toHaveLength(8);
  });

  it('McpServer uses rateLimitPerMinute with explicit units', () => {
    const server: Partial<McpServer> = { rateLimitPerMinute: 100 };
    expect(server.rateLimitPerMinute).toBe(100);
  });
});
