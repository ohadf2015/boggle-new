import { describe, it, expect } from 'vitest';
import { App } from '@capacitor/app';
import { withoutCapacitorThenable } from '../withoutCapacitorThenable';

describe('withoutCapacitorThenable', () => {
  it('App proxy is thenable (Capacitor traps .then as a plugin method)', () => {
    expect(typeof App.then).toBe('function');
  });

  it('strips then so awaiting the plugin does not call App.then()', async () => {
    const safe = withoutCapacitorThenable(App);
    expect(safe.then).toBeUndefined();
    const resolved = await Promise.resolve(safe);
    expect(resolved).toBe(safe);
    expect(typeof resolved.addListener).toBe('function');
  });
});
