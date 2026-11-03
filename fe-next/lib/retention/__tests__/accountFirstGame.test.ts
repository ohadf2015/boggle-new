import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_FIRST_GAME_PENDING_KEY,
  consumeAccountFirstGamePending,
  markFreshSignup,
} from '../accountFirstGame';

function installStorage() {
  const local = new Map<string, string>();
  const g = globalThis as Record<string, unknown>;
  g.localStorage = {
    getItem: (key: string) => local.get(key) ?? null,
    setItem: (key: string, value: string) => { local.set(key, value); },
    removeItem: (key: string) => { local.delete(key); },
    clear: () => { local.clear(); },
  };
  g.window = g;
}

describe('account first game goal', () => {
  it('fires once, and does not re-arm', () => {
    installStorage();
    markFreshSignup({ id: 'u1' }, 'header_or_menu');
    expect(consumeAccountFirstGamePending()).toEqual({ userId: 'u1', surface: 'header_or_menu' });
    expect(consumeAccountFirstGamePending()).toBeNull();
    markFreshSignup({ id: 'u1' }, 'header_or_menu');
    expect(consumeAccountFirstGamePending()).toBeNull();
  });

  it('never arms anonymous sessions', () => {
    installStorage();
    markFreshSignup({ id: 'anon1', is_anonymous: true }, 'header_or_menu');
    expect(localStorage.getItem(ACCOUNT_FIRST_GAME_PENDING_KEY)).toBeNull();
    markFreshSignup(null, 'header_or_menu');
    expect(consumeAccountFirstGamePending()).toBeNull();
  });
});
