'use client';

import { useEffect } from 'react';
import {
  isChunkLoadError,
  recoverFromStaleChunk,
  clearCachesAndReload,
  stripChunkReloadParam,
  CHUNK_RECOVERY_GUARD_KEY,
} from '@/lib/deploy/staleDeployReload';

/**
 * ChunkErrorRecovery — surface-agnostic stale-deploy / CDN-missing chunk recovery.
 *
 * Listens globally for the chunk/module load failures that React error
 * boundaries miss: stale `<script>`/`<link>` 404s (asset `error` events, which
 * don't bubble — hence capture phase) and `next/dynamic` import rejections
 * (unhandled promise rejections).
 *
 * After #893/#935, chunk 2703 / 14850 stayed hot because this listener only
 * reloaded when `/api/version` proved a build mismatch. CDN / offline-shell
 * SWR / flaky-network 404s on a hashed asset are unrecoverable in place even
 * when the version endpoint agrees the build is "current", so we now force
 * ONE cache-busting hard navigation per session (same policy as retryImport
 * and the boot guard). Mounted once, app-wide, beside VersionChecker.
 */
export default function ChunkErrorRecovery(): null {
  useEffect(() => {
    stripChunkReloadParam();

    const attempt = (name: string | undefined, message: string | undefined): void => {
      if (!isChunkLoadError(name, message)) return;
      void recoverFromStaleChunk({
        clientBuildTime: process.env.NEXT_PUBLIC_BUILD_TIME,
        fetchServerBuildTime: async () => {
          const res = await fetch('/api/version?t=' + Date.now(), {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' },
          });
          if (!res.ok) throw new Error('version check failed');
          const data = (await res.json()) as { buildTime?: string };
          return data?.buildTime;
        },
        getGuard: () => {
          try {
            return sessionStorage.getItem(CHUNK_RECOVERY_GUARD_KEY) === 'true';
          } catch {
            return false;
          }
        },
        setGuard: () => {
          try {
            sessionStorage.setItem(CHUNK_RECOVERY_GUARD_KEY, 'true');
          } catch {
            /* sessionStorage unavailable — one-shot navigation is still the primary guard */
          }
        },
        clearCachesAndReload,
        // Content-hashed chunk 404s are unrecoverable in place — do not require
        // a version mismatch (that gate left PostHog ChunkLoadError hot after #893/#935).
        forceOnChunkFailure: true,
      });
    };

    const onError = (e: ErrorEvent): void => {
      const target = e.target as (HTMLElement & { src?: string; href?: string }) | null;
      // Asset load failure: a stale <script>/<link> 404 fires a non-bubbling
      // error event whose target is the failing element (e.error is null).
      if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
        const src = target.src || target.href || '';
        if (src.includes('/_next/static')) {
          attempt('ChunkLoadError', `failed to load chunk ${src}`);
        }
        return;
      }
      if (e.error instanceof Error) attempt(e.error.name, e.error.message);
      else if (e.message) attempt(undefined, e.message);
    };

    const onRejection = (e: PromiseRejectionEvent): void => {
      const reason = (e as { reason?: unknown }).reason;
      if (reason instanceof Error) attempt(reason.name, reason.message);
      else if (typeof reason === 'string') attempt(undefined, reason);
    };

    // Capture phase: asset error events do not bubble to window otherwise.
    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
