/**
 * Capacitor plugin proxies trap unknown property access — including `then`.
 * That makes every plugin a thenable: `await plugin`, `Promise.resolve(plugin)`,
 * or `return plugin` from an async function calls `plugin.then()`, which Capacitor
 * treats as a native method and rejects with
 * `"App.then()" is not implemented on web` (UNIMPLEMENTED).
 *
 * Hide `then` so Promise machinery treats the plugin as a plain value.
 */
export function withoutCapacitorThenable<T extends object>(plugin: T): T {
  return new Proxy(plugin, {
    get(target, prop) {
      if (prop === 'then') return undefined;
      return (target as Record<PropertyKey, unknown>)[prop];
    },
  });
}
