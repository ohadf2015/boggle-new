/**
 * fetchWithAuth - Authenticated fetch with automatic token refresh
 *
 * Handles JWT token expiration gracefully by:
 * 1. Automatically adding Authorization header with current token
 * 2. Detecting 401 Unauthorized responses
 * 3. Refreshing the token via Supabase
 * 4. Retrying the request with fresh token
 *
 * Usage:
 * ```typescript
 * const response = await fetchWithAuth('/api/engagement/calendar');
 * if (response.ok) {
 *   const data = await response.json();
 * }
 * ```
 *
 * @param url - Request URL
 * @param options - Fetch options (headers will be merged with Authorization)
 * @returns Fetch Response
 */

import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

interface FetchWithAuthOptions extends RequestInit {
  headers?: HeadersInit;
  skipAuthRefresh?: boolean; // Set to true to disable auto-refresh (for auth endpoints)
  /**
   * "No session, no request."
   *
   * Without this, a caller with no session still sends the request unauthenticated. For a
   * public-shaped read that is right. For an endpoint that only exists for signed-in users
   * it is a guaranteed 401 whose only product is a red line in session replay — and it can
   * burn a caller's one-shot chance to report something. Opt in and the helper answers 401
   * locally, so the caller's own error handling is unchanged but nothing leaves the device.
   */
  requireSession?: boolean;
}

/**
 * Fetch with automatic authentication and token refresh
 */
export async function fetchWithAuth(
  url: string,
  options: FetchWithAuthOptions = {}
): Promise<Response> {
  if (!supabase) {
    // Downgraded warn → debug: expected on public pages with no Supabase env.
    logger.debug('Supabase not configured - making unauthenticated request');
    return fetch(url, options);
  }

  // Get current session token
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    if (options.requireSession) {
      logger.debug(`No session - skipping authenticated-only request to ${url}`);
      return new Response(null, { status: 401, statusText: 'Unauthorized' });
    }
    // Downgraded warn → debug: fires for every guest request, not actionable.
    logger.debug('No valid session found - making unauthenticated request');
    return fetch(url, options);
  }

  // Merge Authorization header with existing headers
  const headers = new Headers(options.headers);
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  // Make initial request
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // If not 401 or refresh disabled, return response as-is
  if (response.status !== 401 || options.skipAuthRefresh) {
    return response;
  }

  // 401 detected - attempt token refresh
  logger.log('401 detected, attempting token refresh');

  try {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError || !refreshData.session?.access_token) {
      logger.debug('Token refresh failed:', refreshError?.message || 'No session');
      return response; // Return original 401 response
    }

    logger.log('Token refreshed successfully, retrying request');

    // Retry request with fresh token
    const freshHeaders = new Headers(options.headers);
    freshHeaders.set('Authorization', `Bearer ${refreshData.session.access_token}`);

    const retryResponse = await fetch(url, {
      ...options,
      headers: freshHeaders,
    });

    return retryResponse;
  } catch (error) {
    logger.error('Token refresh error:', error);
    return response; // Return original 401 response
  }
}

/**
 * Convenience wrapper for GET requests
 */
export async function getWithAuth(url: string, options: FetchWithAuthOptions = {}): Promise<Response> {
  return fetchWithAuth(url, { ...options, method: 'GET' });
}

/**
 * Convenience wrapper for POST requests
 */
export async function postWithAuth(
  url: string,
  body?: unknown,
  options: FetchWithAuthOptions = {}
): Promise<Response> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetchWithAuth(url, {
    ...options,
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Convenience wrapper for PUT requests
 */
export async function putWithAuth(
  url: string,
  body?: unknown,
  options: FetchWithAuthOptions = {}
): Promise<Response> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetchWithAuth(url, {
    ...options,
    method: 'PUT',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Convenience wrapper for DELETE requests
 */
export async function deleteWithAuth(url: string, options: FetchWithAuthOptions = {}): Promise<Response> {
  return fetchWithAuth(url, { ...options, method: 'DELETE' });
}
