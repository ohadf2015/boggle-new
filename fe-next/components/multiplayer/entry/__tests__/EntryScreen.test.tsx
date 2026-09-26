/**
 * The MP entry hides the global site chrome (header, bottom nav) — DESIGN §b
 * "Chrome". NavigationContext is client state, so flipping `isInGame` alone
 * would SSR the entry WITH chrome and drop it after hydration (a layout shift on
 * the landing). The entry therefore renders a marker in its SSR HTML and ships a
 * stylesheet keyed to it, so the chrome is hidden from first paint.
 */
import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// What the page looked like when the flow first rendered (before any effect).
const seenAtRender: { session: boolean | null } = { session: null };
vi.mock('../../MultiplayerFlow', () => ({
  __esModule: true,
  default: (p: { header?: React.ReactNode }) => {
    if (seenAtRender.session === null) {
      seenAtRender.session = document.documentElement.hasAttribute('data-mp-session');
    }
    return <div data-testid="flow">{p.header}</div>;
  },
}));
vi.mock('../EntryHeader', () => ({ EntryHeader: () => <div data-testid="entry-header" /> }));

// Server-inserted HTML callbacks registered by the entry (SSR stream only).
const serverInserted: Array<() => React.ReactNode> = [];
vi.mock('next/navigation', () => ({
  useServerInsertedHTML: (cb: () => React.ReactNode) => { serverInserted.push(cb); },
}));

import { renderToStaticMarkup } from 'react-dom/server';
import EntryScreen from '../EntryScreen';
import { ENTRY_HIDES_GLOBAL_CHROME, ENTRY_CHROME_ATTR } from '../entryChrome';

const props = {
  handleJoin: vi.fn(), refreshRooms: vi.fn(), activeRooms: [], roomsLoading: false, isJoining: false,
  isAuthenticated: false, displayName: '', defaultLanguage: 'en' as const,
  setGameCode: vi.fn(), setUsername: vi.fn(), setRoomName: vi.fn(), setHostUsername: vi.fn(),
};

describe('EntryScreen chrome', () => {
  it('hides the global chrome on the entry (PageClient reads this flag)', () => {
    expect(ENTRY_HIDES_GLOBAL_CHROME).toBe(true);
  });

  it('renders the first-paint chrome marker and its own header on the public entry', () => {
    const { container } = render(<EntryScreen {...props} />);
    expect(container.querySelector(`[${ENTRY_CHROME_ATTR}="off"]`)).not.toBeNull();
    expect(screen.getByTestId('entry-header')).toBeInTheDocument();
  });

  // A client-side remount of the page tree during hydration drops the SSR marker
  // for a frame while the lazy EntryScreen chunk resolves; the header spacer then
  // flashes in (a 60px layout shift at 390x844). The <html> session mark survives
  // a remount, so it must be on the document BEFORE the entry's first paint —
  // during render, not in an effect.
  it('marks the MP session on <html> during render, before any effect runs', () => {
    document.documentElement.removeAttribute('data-mp-session');
    seenAtRender.session = null;
    render(<EntryScreen {...props} />);
    expect(seenAtRender.session).toBe(true);
  });

  it('classroom entry never marks the MP session', () => {
    document.documentElement.removeAttribute('data-mp-session');
    serverInserted.length = 0;
    render(<EntryScreen {...props} isClassroomMode />);
    expect(document.documentElement.hasAttribute('data-mp-session')).toBe(false);
    const html = serverInserted.map((cb) => renderToStaticMarkup(<>{cb()}</>)).join('');
    expect(html).not.toContain('data-mp-session');
  });

  // On a cold load the page tree is remounted during hydration BEFORE the lazy
  // entry chunk renders on the client (measured: remount ~495ms, first entry
  // render ~534ms), so even a render-time mark lands a frame late. The SSR
  // stream therefore carries a one-line script that marks <html> while the
  // document is still parsing — no client ever renders a <script> element.
  it('streams a parse-time <html> session mark into the SSR HTML, once', () => {
    serverInserted.length = 0;
    render(<EntryScreen {...props} />);
    expect(serverInserted.length).toBeGreaterThan(0);
    const first = serverInserted.map((cb) => renderToStaticMarkup(<>{cb()}</>)).join('');
    expect(first).toMatch(/<script>[^<]*document\.documentElement\.setAttribute\(["']data-mp-session["']/);
    // Next calls inserted-HTML callbacks on every stream flush: emit it once.
    const again = serverInserted.map((cb) => renderToStaticMarkup(<>{cb()}</>)).join('');
    expect(again).toBe('');
  });

  it('classroom entry keeps the education chrome: no marker, no arcade header', () => {
    const { container } = render(<EntryScreen {...props} isClassroomMode />);
    expect(container.querySelector(`[${ENTRY_CHROME_ATTR}]`)).toBeNull();
    expect(screen.queryByTestId('entry-header')).toBeNull();
  });

  it('the stylesheet hides header, header spacer and bottom nav, keyed to the marker', () => {
    const css = readFileSync(join(__dirname, '..', 'entryChrome.css'), 'utf8');
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(rules).toContain(`[${ENTRY_CHROME_ATTR}='off']`);
    expect(rules).toMatch(/header\.fixed/);
    expect(rules).toMatch(/\[data-global-bottom-nav\]/);
    expect(rules).toMatch(/\.h-header/);
    expect(rules).toMatch(/display:\s*none\s*!important/);
  });
});
