export const DEFAULT_QUERY_LIMIT = 100;
export const MAX_QUERY_LIMIT = 500;
export const MAX_FILTER_LENGTH = 200;

/** Escape LIKE/ILIKE metacharacters to prevent pattern injection */
export function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}
