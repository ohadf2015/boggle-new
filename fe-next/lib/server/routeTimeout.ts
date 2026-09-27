import { NextResponse } from 'next/server';

/**
 * Wall-clock caps for Next.js API routes running behind the custom Express
 * server (Railway). `export const maxDuration` is a Vercel-only enforcement
 * mechanism and does NOTHING under a self-hosted custom server — Node just
 * lets the handler run. A route excluded from Express's own 30s cap
 * (server/middleware.ts ROUTES_WITH_CUSTOM_TIMEOUT) therefore has no ceiling
 * at all unless it enforces one itself. Use `withRouteTimeout` for that
 * ceiling around a route handler, and `withTimeout` to bound any single
 * awaited call (an outbound API request, one DB round trip) wherever it's
 * called from — a route, a shared lib function, anything.
 */

export function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout?: () => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout?.();
      reject(new Error(`timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

export interface PhaseRef<P extends string = string> {
  current: P;
  method: string;
  action?: string;
}

export interface RouteTimeoutOptions<P extends string = string> {
  /** Tag prefixing the console.warn on timeout, e.g. the route's own name. */
  label: string;
  ms: number;
  /** Mutate `.current` as the handler progresses to log where it hung. */
  phaseRef?: PhaseRef<P>;
  onTimeoutResponse?: () => NextResponse;
}

/**
 * Races a route handler's work against a wall-clock cap. On timeout, resolves
 * (does not reject) with a 504 so the route always returns a response instead
 * of hanging until an upstream proxy or Node's keepAliveTimeout gives up.
 */
export function withRouteTimeout<T extends NextResponse, P extends string = string>(
  opts: RouteTimeoutOptions<P>,
  work: Promise<T>,
): Promise<T | NextResponse> {
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<NextResponse>((resolve) => {
    timer = setTimeout(() => {
      const { phaseRef } = opts;
      const detail = phaseRef
        ? ` method=${phaseRef.method} action=${phaseRef.action ?? '?'} stuck-at=${phaseRef.current}`
        : '';
      console.warn(`[${opts.label}] wall-clock timeout${detail}`);
      resolve(opts.onTimeoutResponse ? opts.onTimeoutResponse() : NextResponse.json({ error: 'Timeout' }, { status: 504 }));
    }, opts.ms);
  });

  return Promise.race<T | NextResponse>([work, timeoutPromise]).finally(() => clearTimeout(timer));
}
