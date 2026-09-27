import { describe, it, expect, vi } from 'vitest';
import { loadBrowserSqlJs } from '../storage';

/**
 * Regression: prod threw `RuntimeError: Aborted(both async and sync fetching of
 * the wasm failed)` on /daily/word-wheel because emscripten's internal fetch of
 * /sql/sql-wasm.wasm 404'd and aborted from a detached callback — escaping the
 * try/catch in tryValidateOffline. Fix: fetch the binary ourselves and hand
 * `wasmBinary` to sql.js, so any load failure is a normal catchable Error and
 * emscripten never reaches its abort path.
 */
describe('loadBrowserSqlJs', () => {
  it('throws a catchable Error (not an emscripten abort) when the wasm asset 404s', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('not found', { status: 404 }));
    const init = vi.fn();
    await expect(loadBrowserSqlJs(init as never, fetchFn as never)).rejects.toThrow(/404/);
    expect(init).not.toHaveBeenCalled();
  });

  it('rejects (catchable) when fetch itself throws on a transient network failure', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError('network'));
    const init = vi.fn();
    await expect(loadBrowserSqlJs(init as never, fetchFn as never)).rejects.toBeInstanceOf(TypeError);
    expect(init).not.toHaveBeenCalled();
  });

  it('fetches the binary itself and inits sql.js from wasmBinary (no locateFile fetch)', async () => {
    const bytes = new Uint8Array([0, 97, 115, 109]).buffer;
    const fetchFn = vi.fn().mockResolvedValue(new Response(bytes, { status: 200 }));
    const sentinel = { Database: class {} } as never;
    const init = vi.fn().mockResolvedValue(sentinel);
    const mod = await loadBrowserSqlJs(init as never, fetchFn as never);
    expect(fetchFn).toHaveBeenCalledWith('/sql/sql-wasm.wasm');
    const arg = (init as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg).toHaveProperty('wasmBinary');
    expect(arg.locateFile).toBeUndefined();
    expect(mod).toBe(sentinel);
  });
});
