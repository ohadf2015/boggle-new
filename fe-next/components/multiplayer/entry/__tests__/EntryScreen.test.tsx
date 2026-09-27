/**
 * The MP entry hides the global site chrome (header, bottom nav) — DESIGN §b
 * "Chrome". NavigationContext is client state, so flipping `isInGame` alone
 * would SSR the entry WITH chrome and drop it after hydration (a layout shift on
 * the landing). The entry therefore renders a marker in its SSR HTML and ships a
 * stylesheet keyed to it, so the chrome is hidden from first paint.
 *
 * Every rule is keyed to MP DOM (the marker, or an MpScreen), never to a
 * document-level flag: nothing ENTRY owns sees the route change that would have
 * to clear such a flag, so it would outlive /multiplayer and strip the header
 * spacer from every page visited next.
 */
import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../MultiplayerFlow', () => ({
  __esModule: true,
  default: (p: { header?: React.ReactNode }) => <div data-testid="flow">{p.header}</div>,
}));
vi.mock('../EntryHeader', () => ({ EntryHeader: () => <div data-testid="entry-header" /> }));

// Server-inserted HTML callbacks registered by the entry (SSR stream only).
const serverInserted: Array<() => React.ReactNode> = [];
vi.mock('next/navigation', () => ({
  useServerInsertedHTML: (cb: () => React.ReactNode) => { serverInserted.push(cb); },
}));

import { renderToStaticMarkup } from 'react-dom/server';
import EntryScreen from '../EntryScreen';
import { ENTRY_HIDES_GLOBAL_CHROME, ENTRY_CHROME_ATTR, MP_ROUTE_CANONICAL } from '../entryChrome';

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

  it('never writes a document-level mark: no render-time write, no server-inserted script', () => {
    serverInserted.length = 0;
    render(<EntryScreen {...props} />);
    const mpAttrs = document.documentElement.getAttributeNames().filter((name) => name.startsWith('data-mp'));
    expect(mpAttrs).toEqual([]);
    const streamed = serverInserted.map((cb) => renderToStaticMarkup(<>{cb()}</>)).join('');
    expect(streamed).toBe('');
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

  // Every rule is keyed to the MP route itself — the entry's SSR marker, an
  // MpScreen, or the MP layout's canonical <link> (Next swaps route metadata in
  // the same commit that leaves the route) — never to a flag something has to
  // clear: nothing ENTRY owns sees the route change that would clear it.
  const ROUTE_SCOPES = [
    `body:has([${ENTRY_CHROME_ATTR}='off']) `,
    'body:has([data-mp-screen]) ',
    `html:has(${MP_ROUTE_CANONICAL}) `,
  ];
  const SPACER = "[aria-hidden='true'].h-header";

  function chromeSelectors(): string[] {
    const css = readFileSync(join(__dirname, '..', 'entryChrome.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    return Array.from(css.matchAll(/([^{}]+)\{[^}]*\}/g))
      .flatMap((m) => m[1].split(','))
      .map((sel) => sel.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }

  it('scopes every rule to the MP route, so leaving it never leaves chrome hidden', () => {
    const selectors = chromeSelectors();
    expect(selectors.length).toBeGreaterThan(0);
    for (const sel of selectors) {
      expect(ROUTE_SCOPES.some((scope) => sel.startsWith(scope))).toBe(true);
    }
    // In-room phases (lobby, round, results) render in an MpScreen.
    expect(selectors).toContain(`body:has([data-mp-screen]) ${SPACER}`);
  });

  // With the flag on, AutoHideHeader keeps its CLS spacer after a cold load (no
  // tap before `isInGame` flipped). Between MP screens nothing carries the entry
  // marker or an MpScreen: while the lazy entry chunk resolves after hydration
  // (measured: SSR entry dropped for ~40ms at 390x844, CLS 0.144) and while a
  // room's lazy view loads after QUICK START (0.071 down, 0.071 back up). The
  // route-level rule keeps the spacer out for the whole MP session.
  it('hides the header spacer for the whole MP route, and ONLY the spacer (classroom keeps its header)', () => {
    const routeRules = chromeSelectors().filter((sel) => sel.startsWith(`html:has(${MP_ROUTE_CANONICAL}) `));
    expect(routeRules).toEqual([`html:has(${MP_ROUTE_CANONICAL}) ${SPACER}`]);
  });
});
