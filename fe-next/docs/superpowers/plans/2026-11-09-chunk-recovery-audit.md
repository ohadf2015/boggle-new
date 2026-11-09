# ChunkLoadError recovery audit (2026-11-09)

## Stack inspected
- Pre-hydration: `utils/chunkBootGuard.ts` → `CHUNK_BOOT_GUARD_SCRIPT` in `app/[locale]/layout.tsx`
- Post-hydration: `components/ChunkErrorRecovery.tsx` mounted in `app/[locale]/LocaleBodyChrome.tsx`
- Shared: `lib/deploy/staleDeployReload.ts` (`forceOnChunkFailure: true`, one-reload `CHUNK_RECOVERY_GUARD_KEY`)
- Dynamic: `utils/retryImport.ts`
- Long tab: `components/StaleBuildReloader.tsx` via `DeferredLayoutWidgets.tsx`
- Boundaries: `components/ErrorBoundaries.tsx` delegates to same helpers
- Tests: `staleDeployReload.test.ts`, `ChunkErrorRecovery.test.tsx`, `chunkBootGuard.test.ts` — all green this pass

## Mount hole check
- App routes under `[locale]` get LocaleBodyChrome → ChunkErrorRecovery.
- Root `app/layout.tsx` is a thin shell; locale layout owns recovery. No alternate product layout missing the mount found.

## Behavioral gap
- Existing suite already proves: force reload on chunk failure even when versions match; one-shot guard; crawler exclusion; no reload on non-chunk errors.
- Spec “likely gaps” (friendlier flash UI, in-game deferral parity, PostHog host filter on errors) are UX/ops — not a confirmed one-reload failure.

## Verdict
**No code change.** Inventing a second reload path would risk duplicate loops. Residual: optional `growth:chunk_reload_*` instrumentation (spec Part B) deferred — not required without a proven reload gap.
