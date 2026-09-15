import { createRequire } from 'module';

/**
 * Webpack chunk-load retry — retry ONCE before ChunkLoadError is born (t_21d84a95).
 * Residual class after #979/#1050: ~1 chunk exception/week from TRANSIENT fetch
 * failures — the chunk file is served 200, the client's fetch flakes, webpack's
 * `__webpack_require__.l` (loadScript) reports the failure, and the ChunkLoadError
 * is created by webpack's chunk-loading handler. PostHog $exception fires at throw
 * time even when ChunkErrorRecovery's reload later succeeds, so every transient
 * flake pollutes the error dashboard and costs the user a full page reload.
 *
 * What this plugin does: a RuntimeModule (STAGE_ATTACH — runs right after webpack
 * defines `__webpack_require__.l` at STAGE_NORMAL) wraps the loader so a failed
 * chunk <script> re-requests ONCE with a `lc_retry=<ts>` cache-bust query param —
 * the content hash in the filename is unchanged, so the server serves identical
 * content, but the browser cannot re-serve the poisoned/failed cache entry. Only
 * if the retry also fails does the error event reach webpack's handler and become
 * a ChunkLoadError (where the existing recovery stack takes over).
 *
 * Verified against the Next 16.2 / webpack 5.105 runtime live on lexiclash.live
 * (2026-09-15, `/_next/static/chunks/webpack-*.js`): loadScript is
 * `u.l = (url, done, key, chunkId) => {...}` with per-URL inProgress dedupe and
 * `done(event)` where `event.type !== 'load'` means failure (error/timeout).
 * Under Turbopack this plugin never runs — Turbopack ignores webpack plugins —
 * which is safe: the retry is a webpack-runtime-only hardening.
 *
 * Shape contract pinned by lib/deploy/__tests__/chunkLoadRetryPlugin.test.ts,
 * including a behavioral simulation of webpack's loadScript port.
 */

/** Cache-bust query param stamped onto the single retry request. */
export const CHUNK_RETRY_PARAM = 'lc_retry';

/**
 * The browser-side wrapper source, emitted into the webpack runtime bundle.
 * Kept as a standalone builder (no webpack imports) so the exact bytes shipped
 * to users are unit-testable without a webpack Compilation.
 *
 * Semantics:
 *  - success (`event.type === 'load'`, or any falsy event) → pass through.
 *  - failure, URL not already retried → re-request once with `lc_retry=`.
 *  - failure on the retry URL → pass through (recovery stack handles it).
 *  - `key`/`chunkId` are forwarded verbatim so webpack's script-dedupe and
 *    installedChunks bookkeeping stay consistent across the retry.
 */
export function buildChunkLoadRetryRuntimeSource() {
  return [
    'var originalLoadScript = __webpack_require__.l;',
    '__webpack_require__.l = function(url, done, key, chunkId) {',
    '  originalLoadScript.call(__webpack_require__, url, function(event) {',
    '    var failed = !!(event && event.type !== "load");',
    '    if (failed && url.indexOf("' + CHUNK_RETRY_PARAM + '=") === -1) {',
    '      var sep = url.indexOf("?") === -1 ? "?" : "&";',
    '      var retryUrl = url + sep + "' + CHUNK_RETRY_PARAM + '=" + Date.now();',
    '      originalLoadScript.call(__webpack_require__, retryUrl, done, key, chunkId);',
    '    } else {',
    '      done(event);',
    '    }',
    '  }, key, chunkId);',
    '};',
  ].join('\n');
}

/**
 * Webpack classes — this module is build-time-only (imported by next.config.mjs
 * and vitest), never bundled into the client, so requiring webpack here is safe.
 */
const require_ = createRequire(import.meta.url);
const { RuntimeModule, RuntimeGlobals } = require_('webpack');

/** RuntimeModule emitted at STAGE_ATTACH (after loadScript's STAGE_NORMAL definition). */
export class ChunkLoadRetryRuntimeModule extends RuntimeModule {
  constructor() {
    super('LexiClashChunkLoadRetry', RuntimeModule.STAGE_ATTACH);
  }

  generate() {
    return buildChunkLoadRetryRuntimeSource();
  }
}

const PLUGIN_NAME = 'LexiClashChunkLoadRetryPlugin';

/**
 * Adds the retry wrapper to the CLIENT runtime whenever chunk script loading
 * (`__webpack_require__.l`) is required. No-op for server/edge compilers —
 * document.head does not exist there and chunk loads don't go through .l.
 */
export class ChunkLoadRetryPlugin {
  apply(compiler) {
    if (compiler.options.name !== 'client') return;
    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      compilation.hooks.runtimeRequirementInTree.for(RuntimeGlobals.loadScript).tap(
        PLUGIN_NAME,
        (chunk) => {
          compilation.addRuntimeModule(chunk, new ChunkLoadRetryRuntimeModule());
        },
      );
    });
  }
}

export default ChunkLoadRetryPlugin;
