export interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
}

/** Offset-based pagination metadata (response) */
export interface PaginationMeta {
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly hasMore: boolean;
}

/** Cursor-based pagination metadata (response) */
export interface CursorPaginationMeta {
  readonly cursor: string | null;
  readonly limit: number;
  readonly hasMore: boolean;
}

export type ApiResponse<T> =
  | {
      readonly success: true;
      readonly data: T;
      readonly error: null;
      readonly meta?: PaginationMeta | CursorPaginationMeta;
    }
  | {
      readonly success: false;
      readonly data: null;
      readonly error: ApiError;
    };

export function createSuccessResponse<T>(
  data: T,
  meta?: PaginationMeta | CursorPaginationMeta,
): ApiResponse<T> {
  return {
    success: true as const,
    data,
    error: null,
    ...(meta !== undefined ? { meta } : {}),
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown,
): ApiResponse<never> {
  return {
    success: false as const,
    data: null,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  };
}
