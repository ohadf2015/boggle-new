import { describe, it, expect, vi } from 'vitest';
import { PRACTICE_SEAT_SCRIPT } from '../practiceSeatStorage';

function memStorage() {
  const store: Record<string, string> = {};
  return {
    store,
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

/** A document whose `cookie` accessor lives on its prototype, like a real one. */
class FakeDocument {
  jar: Record<string, string> = {};
  get cookie(): string {
    return Object.entries(this.jar)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }
  set cookie(raw: string) {
    const [first, ...attrs] = raw.split(';');
    const eq = first.indexOf('=');
    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1);
    const expired = attrs.some((a) => /max-age=0/i.test(a));
    if (expired) delete this.jar[name];
    else this.jar[name] = value;
  }
}

class FakeChannel {
  static sent: unknown[] = [];
  postMessage(msg: unknown) {
    FakeChannel.sent.push(msg);
  }
}

function makeWindow(search: string) {
  const localStorage = memStorage();
  const sessionStorage = memStorage();
  const document = new FakeDocument();
  FakeChannel.sent = [];
  const win: Record<string, unknown> = {
    location: { search },
    localStorage,
    sessionStorage,
    document,
    BroadcastChannel: FakeChannel,
  };
  return { win, realLocal: localStorage, realSession: sessionStorage, document };
}

function run(win: Record<string, unknown>) {
  new Function('window', PRACTICE_SEAT_SCRIPT)(win);
}

describe('PRACTICE_SEAT_SCRIPT', () => {
  it('does nothing on a normal page', () => {
    const { win, realLocal, document } = makeWindow('?room=ABCD');
    run(win);
    expect(win.localStorage).toBe(realLocal);
    expect(win.__LC_PRACTICE_SEAT__).toBeUndefined();
    document.cookie = 'lc_pref=1; path=/';
    expect(document.jar.lc_pref).toBe('1');
  });

  it('keeps app data in memory so the host page’s saved game is untouched', () => {
    const { win, realLocal, realSession } = makeWindow('?room=ABCD&practiceSeat=1');
    realLocal.setItem('boggle_username', 'Teacher');
    run(win);

    const ls = win.localStorage as Storage;
    expect(ls.getItem('boggle_username')).toBeNull();
    ls.setItem('boggle_username', 'Dana (practice)');
    expect(ls.getItem('boggle_username')).toBe('Dana (practice)');
    expect(realLocal.getItem('boggle_username')).toBe('Teacher');

    (win.sessionStorage as Storage).setItem('lexiclash_session', '{"room":"ABCD"}');
    expect(realSession.getItem('lexiclash_session')).toBeNull();
    expect(win.__LC_PRACTICE_SEAT__).toBe(true);
  });

  it('shares Supabase auth keys but never removes them', () => {
    const { win, realLocal } = makeWindow('?practiceSeat=1');
    realLocal.setItem('sb-ref-auth-token', 'session');
    run(win);

    const ls = win.localStorage as Storage;
    expect(ls.getItem('sb-ref-auth-token')).toBe('session');
    ls.setItem('sb-ref-auth-token', 'refreshed');
    expect(realLocal.getItem('sb-ref-auth-token')).toBe('refreshed');
    ls.removeItem('sb-ref-auth-token');
    ls.clear();
    expect(realLocal.getItem('sb-ref-auth-token')).toBe('refreshed');
  });

  it('lets auth cookies refresh but blocks deleting them, and keeps other cookies in memory', () => {
    const { win, document } = makeWindow('?practiceSeat=1');
    document.jar['sb-ref-auth-token'] = 'old';
    document.jar['lc_host_pref'] = 'x';
    run(win);

    const doc = win.document as { cookie: string };
    expect(doc.cookie).toBe('sb-ref-auth-token=old');

    doc.cookie = 'sb-ref-auth-token=new; path=/; max-age=31536000';
    expect(document.jar['sb-ref-auth-token']).toBe('new');

    doc.cookie = 'sb-ref-auth-token=; path=/; max-age=0';
    doc.cookie = 'sb-ref-auth-token=gone; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    expect(document.jar['sb-ref-auth-token']).toBe('new');

    doc.cookie = 'lc_pref=2; path=/';
    expect(document.jar.lc_pref).toBeUndefined();
    expect(doc.cookie).toContain('lc_pref=2');
    doc.cookie = 'lc_pref=; max-age=0';
    expect(doc.cookie).not.toContain('lc_pref');
  });

  it('mutes cross-tab broadcasts so a sign-out never reaches the host tab', () => {
    const { win } = makeWindow('?practiceSeat=1');
    run(win);
    const Channel = win.BroadcastChannel as typeof FakeChannel;
    new Channel().postMessage({ type: 'SIGNED_OUT' });
    expect(FakeChannel.sent).toEqual([]);
  });

  it('never throws when storage is missing', () => {
    const win = { location: { search: '?practiceSeat=1' } };
    expect(() => run(win)).not.toThrow();
    vi.restoreAllMocks();
  });
});

describe('PRACTICE_SEAT_SCRIPT when framed beside the board', () => {
  it('starts with music and sound effects muted', () => {
    const { win } = makeWindow('?practiceSeat=1');
    win.self = win;
    win.top = {};
    run(win);
    const ls = win.localStorage as Storage;
    expect(JSON.parse(ls.getItem('boggle_music_settings') ?? '{}').isMuted).toBe(true);
    expect(JSON.parse(ls.getItem('boggle_sfx_settings') ?? '{}').muted).toBe(true);
    expect(win.__LC_PRACTICE_FRAMED__).toBe(true);
  });

  it('keeps sound as is in its own tab or on a phone', () => {
    const { win } = makeWindow('?practiceSeat=1');
    win.self = win;
    win.top = win;
    run(win);
    expect((win.localStorage as Storage).getItem('boggle_music_settings')).toBeNull();
    expect(win.__LC_PRACTICE_FRAMED__).toBe(false);
  });
});
