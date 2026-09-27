/**
 * Tests for the webpack chunk-load retry runtime (t_21d84a95).
 *
 * Context: after #979/#1050, residual ChunkLoadError trickle (~1/week) comes
 * from TRANSIENT fetch failures — the chunk file is served 200, the client's
 * fetch flakes, webpack's loadScript reports the error and the ChunkLoadError
 * is born (PostHog $exception fires at throw time even when recovery reload
 * later succeeds). This plugin wraps webpack's `__webpack_require__.l` so a
 * failed chunk script re-requests ONCE with a cache-bust query param
 * (`lc_retry=`, hashed content is identical) before the error is surfaced —
 * cutting the trickle to ~0 without a page reload.
 *
 * The runtime shape under test is verified against the Next 16 webpack 5.105
 * runtime live on lexiclash.live: `u.l = (url, done, key, chunkId) => {...}`
 * where done receives a `{type:'load'}` event on success or an error/timeout
 * event on failure, and the ChunkLoadError is created by the CALLER of `.l`
 * after done fires — so intercepting done before it reaches the caller
 * retries BEFORE the throw.
 */
import { describe, it, expect } from 'vitest';
import {
  buildChunkLoadRetryRuntimeSource,
  CHUNK_RETRY_PARAM,
  ChunkLoadRetryPlugin,
  ChunkLoadRetryRuntimeModule,
} from '../chunkLoadRetryPlugin.mjs';
import { RuntimeGlobals, RuntimeModule } from 'webpack';

type SimBehavior = (url: string) => 'load' | 'error';

interface Sim {
  /** The webpack-require-like object the generated source is evaluated against. */
  webpackRequire: { l: (...args: unknown[]) => void };
  /** Every [url, key, chunkId] the underlying loadScript saw, in order. */
  loads: Array<[string, unknown, unknown]>;
}

/**
 * Faithful port of webpack 5's loadScript runtime (as minified into the live
 * `_next/static/chunks/webpack-*.js`): per-URL inProgress callback queue,
 * done(event) on error/load, inProgress cleanup BEFORE done runs (so a retry
 * is safe), key/chunkId forwarded.
 */
function makeWebpackLoadScriptSim(behavior: SimBehavior): Sim {
  const loads: Sim['loads'] = [];
  const inProgress: Record<string, Array<(event: { type: string }) => void>> = {};
  const fakeRequire = {
    l(url: string, done: (event: { type: string }) => void, key: unknown, chunkId: unknown) {
      if (inProgress[url]) {
        inProgress[url].push(done);
        return;
      }
      loads.push([url, key, chunkId]);
      inProgress[url] = [done];
      const complete = (prev: unknown, event: { type: string }) => {
        const fns = inProgress[url];
        delete inProgress[url];
        fns.forEach((fn) => fn(event));
        if (prev && typeof prev === 'function') return (prev as (e: { type: string }) => void)(event);
      };
      queueMicrotask(() => {
        const result = behavior(url);
        complete(null, { type: result });
      });
    },
  };
  return { webpackRequire: fakeRequire, loads };
}

/** Evaluate the generated runtime source against a fake __webpack_require__. */
function installRetry(sim: Sim): void {
  const factory = new Function('__webpack_require__', buildChunkLoadRetryRuntimeSource());
  factory(sim.webpackRequire);
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('buildChunkLoadRetryRuntimeSource — static shape', () => {
  it('preserves the original loadScript before overriding __webpack_require__.l', () => {
    const src = buildChunkLoadRetryRuntimeSource();
    expect(src).toContain('__webpack_require__.l');
    expect(src).toMatch(/originalLoadScript\s*=\s*__webpack_require__\.l/);
  });

  it('retries with a lc_retry cache-bust param exactly once (no retry loop)', () => {
    const src = buildChunkLoadRetryRuntimeSource();
    expect(src).toContain(`${CHUNK_RETRY_PARAM}=`);
    expect(src).toContain(`indexOf("${CHUNK_RETRY_PARAM}=") === -1`);
  });

  it('forwards done, key and chunkId into the retry call', () => {
    const src = buildChunkLoadRetryRuntimeSource();
    // retry must re-enter loadScript with the same done/key/chunkId so webpack's
    // chunk bookkeeping (installedChunks) stays consistent
    expect(src).toMatch(/originalLoadScript\.call\(__webpack_require__,\s*retryUrl,\s*done,\s*key,\s*chunkId\)/);
  });

  it('surfaces the event via done when the load succeeds or the retry also fails', () => {
    const src = buildChunkLoadRetryRuntimeSource();
    expect(src).toContain('done(event);');
  });
});

describe('chunk-load retry — behavioral simulation (webpack 5 loadScript port)', () => {
  it('transient failure: retries with cache-bust URL, resolves, never surfaces an error', async () => {
    const sim = makeWebpackLoadScriptSim((url) => (url.includes(`${CHUNK_RETRY_PARAM}=`) ? 'load' : 'error'));
    installRetry(sim);

    const doneCalls: Array<{ type: string }> = [];
    sim.webpackRequire.l('/_next/static/chunks/1234-abc.js', (e) => doneCalls.push(e), 'k1', 1234);
    await flush();

    expect(doneCalls).toEqual([{ type: 'load' }]);
    expect(sim.loads).toHaveLength(2);
    expect(sim.loads[0][0]).toBe('/_next/static/chunks/1234-abc.js');
    expect(sim.loads[1][0]).toContain(`${CHUNK_RETRY_PARAM}=`);
    expect(sim.loads[1][0].startsWith('/_next/static/chunks/1234-abc.js?')).toBe(true);
    // key/chunkId forwarded through the retry
    expect(sim.loads[1][1]).toBe('k1');
    expect(sim.loads[1][2]).toBe(1234);
  });

  it('persistent failure: surfaces the error exactly once after exactly two attempts', async () => {
    const sim = makeWebpackLoadScriptSim(() => 'error');
    installRetry(sim);

    const doneCalls: Array<{ type: string }> = [];
    sim.webpackRequire.l('/_next/static/chunks/99-x.js', (e) => doneCalls.push(e), undefined, 99);
    await flush();

    expect(doneCalls).toEqual([{ type: 'error' }]);
    expect(sim.loads).toHaveLength(2);
  });

  it('retry URL that fails is NOT retried again (no third request)', async () => {
    const sim = makeWebpackLoadScriptSim(() => 'error');
    installRetry(sim);

    const doneCalls: Array<{ type: string }> = [];
    sim.webpackRequire.l('/_next/static/chunks/7-y.js', (e) => doneCalls.push(e), undefined, 7);
    await flush();

    expect(sim.loads).toHaveLength(2);
    expect(sim.loads[1][0]).toContain(`${CHUNK_RETRY_PARAM}=`);
    expect(doneCalls).toEqual([{ type: 'error' }]);
  });

  it('clean load: no retry at all', async () => {
    const sim = makeWebpackLoadScriptSim(() => 'load');
    installRetry(sim);

    const doneCalls: Array<{ type: string }> = [];
    sim.webpackRequire.l('/_next/static/chunks/1-a.js', (e) => doneCalls.push(e), undefined, 1);
    await flush();

    expect(sim.loads).toHaveLength(1);
    expect(doneCalls).toEqual([{ type: 'load' }]);
  });

  it('timeout-style events (type !== load) also trigger the retry', async () => {
    const sim = makeWebpackLoadScriptSim((url) => (url.includes(`${CHUNK_RETRY_PARAM}=`) ? 'load' : 'timeout'));
    installRetry(sim);

    const doneCalls: Array<{ type: string }> = [];
    sim.webpackRequire.l('/_next/static/chunks/5-t.js', (e) => doneCalls.push(e), undefined, 5);
    await flush();

    expect(doneCalls).toEqual([{ type: 'load' }]);
    expect(sim.loads).toHaveLength(2);
  });

  it('two concurrent chunk loads each retry independently (per-URL inProgress)', async () => {
    const sim = makeWebpackLoadScriptSim((url) => (url.includes(`${CHUNK_RETRY_PARAM}=`) ? 'load' : 'error'));
    installRetry(sim);

    const a: Array<{ type: string }> = [];
    const b: Array<{ type: string }> = [];
    sim.webpackRequire.l('/_next/static/chunks/10-a.js', (e) => a.push(e), undefined, 10);
    sim.webpackRequire.l('/_next/static/chunks/20-b.js', (e) => b.push(e), undefined, 20);
    await flush();

    expect(a).toEqual([{ type: 'load' }]);
    expect(b).toEqual([{ type: 'load' }]);
    expect(sim.loads).toHaveLength(4);
  });
});

describe('ChunkLoadRetryRuntimeModule', () => {
  it('emits the retry wrapper source', () => {
    const mod = new ChunkLoadRetryRuntimeModule();
    const src = mod.generate();
    expect(src).toContain(`${CHUNK_RETRY_PARAM}=`);
    expect(src).toContain(RuntimeGlobals.loadScript);
  });

  it('runs at STAGE_ATTACH — after webpack defines __webpack_require__.l (STAGE_NORMAL)', () => {
    const mod = new ChunkLoadRetryRuntimeModule();
    expect(mod.stage).toBe(RuntimeModule.STAGE_ATTACH);
    expect(RuntimeModule.STAGE_ATTACH).toBeGreaterThan(RuntimeModule.STAGE_NORMAL);
  });
});

describe('ChunkLoadRetryPlugin', () => {
  function makeFakeCompiler(name: string) {
    const taps: string[] = [];
    const added: unknown[] = [];
    // Mirror webpack: tapping registers the handler AND the hook fires it when
    // the requirement is triggered — so invoke it immediately with a fake chunk.
    const fakeRequirement = {
      tap: (_n: string, cb: (chunk: unknown, set: unknown) => void) => {
        taps.push(_n);
        cb({}, new Set());
      },
    };
    const compiler = {
      options: { name },
      hooks: {
        compilation: {
          tap: (_n: string, cb: (compilation: unknown) => void) => {
            cb({
              hooks: {
                runtimeRequirementInTree: {
                  for: (_req: string) => {
                    expect(_req).toBe(RuntimeGlobals.loadScript);
                    return fakeRequirement;
                  },
                },
              },
              addRuntimeModule: (_chunk: unknown, mod: unknown) => added.push(mod),
            });
          },
        },
      },
    };
    return { compiler, taps, added };
  }

  it('adds the retry runtime module when the client build requires loadScript', () => {
    const { compiler, taps, added } = makeFakeCompiler('client');
    new ChunkLoadRetryPlugin().apply(compiler as never);
    expect(taps).toHaveLength(1);
    expect(added).toHaveLength(1);
    expect((added[0] as ChunkLoadRetryRuntimeModule).generate()).toContain(`${CHUNK_RETRY_PARAM}=`);
  });

  it('is a no-op outside the client compiler (server/edge)', () => {
    for (const name of ['server', 'edge-server']) {
      const { compiler, taps } = makeFakeCompiler(name);
      new ChunkLoadRetryPlugin().apply(compiler as never);
      expect(taps).toHaveLength(0);
    }
  });
});
