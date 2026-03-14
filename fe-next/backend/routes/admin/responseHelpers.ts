/**
 * Standardized admin API response helpers.
 * All admin routes should use these for consistent response shapes.
 */

export interface SuccessEnvelope<T> {
  ok: true;
  data: T;
  meta: Record<string, unknown>;
  timestamp: string;
}

export interface ErrorEnvelope {
  ok: false;
  error: { code: string; message: string; details: unknown };
  timestamp: string;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export function successResponse<T>(data: T, meta?: Record<string, unknown>): SuccessEnvelope<T> {
  return {
    ok: true,
    data,
    meta: meta ?? {},
    timestamp: new Date().toISOString(),
  };
}

export function errorResponse(code: string, message: string, details?: unknown): ErrorEnvelope {
  return {
    ok: false,
    error: { code, message, details: details ?? null },
    timestamp: new Date().toISOString(),
  };
}

export function buildPaginationMeta(
  total: number,
  params: { limit: number; offset: number },
  nextCursor?: string
): PaginationMeta {
  return {
    total,
    limit: params.limit,
    offset: params.offset,
    hasMore: total > params.offset + params.limit,
    nextCursor: nextCursor ?? null,
  };
}

export function paginatedResponse<T>(
  items: T[],
  pagination: PaginationMeta
): SuccessEnvelope<{ items: T[]; pagination: PaginationMeta }> {
  return successResponse({ items, pagination });
}
