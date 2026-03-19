/** Offset-based pagination parameters (request). See PaginationMeta in api.ts for response. */
export interface PaginationParams {
  readonly page: number;
  readonly limit: number;
}

/** Cursor-based pagination parameters (request). See CursorPaginationMeta in api.ts for response. */
export interface CursorPaginationParams {
  readonly cursor?: string | null;
  readonly limit: number;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
