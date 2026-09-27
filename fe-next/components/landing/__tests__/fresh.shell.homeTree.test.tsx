/**
 * Piece A (shell): ONE returning-visitor predicate picks the homepage tree.
 *
 * The pre-paint inline script (HOME_TREE_SCRIPT) and PageClient's
 * isReturningVisitor() must agree on every storage shape, or a returning user
 * gets the fresh page painted and then swapped (CLS), or a fresh visitor gets
 * the returning tree. The script is the serialized predicate, so this test
 * evaluates the exact string that ships and compares it to the runtime call.
 */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { HOME_TREE_SCRIPT } from '@/utils/returningVisitor';
import { isReturningVisitor, hasSupabaseSession } from '@/utils/onboardingStorage';
import { HomeTreeSlot, HomeTreeBoot } from '../homeTree';

const LIVE = JSON.stringify({ access_token: 'abc', refresh_token: 'r' });

function clearCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0].trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
}

function runScript(): string | null {
  document.documentElement.removeAttribute('data-home');
  // Evaluates the exact shipped inline script (a module constant, no input).
  new Function(HOME_TREE_SCRIPT)();
  return document.documentElement.getAttribute('data-home');
}

const FIXTURES: Array<{ name: string; setup: () => void; returning: boolean }> = [
  { name: 'empty storage', setup: () => {}, returning: false },
  { name: 'onboarding completed', setup: () => localStorage.setItem('lexiclash_onboarding_completed', 'true'), returning: true },
  { name: 'onboarding skipped', setup: () => localStorage.setItem('lexiclash_onboarding_completed', 'skipped'), returning: true },
  { name: 'unknown flag value', setup: () => localStorage.setItem('lexiclash_onboarding_completed', 'nope'), returning: false },
  { name: 'live supabase token in localStorage', setup: () => localStorage.setItem('sb-proj-auth-token', LIVE), returning: true },
  { name: 'signed-out "null" token', setup: () => localStorage.setItem('sb-proj-auth-token', 'null'), returning: false },
  { name: 'token without access_token', setup: () => localStorage.setItem('sb-proj-auth-token', '{"user":null}'), returning: false },
  { name: 'live supabase cookie', setup: () => { document.cookie = `sb-proj-auth-token=${encodeURIComponent(LIVE)}; path=/`; }, returning: true },
  { name: 'malformed cookie', setup: () => { document.cookie = 'sb-proj-auth-token=%E0%A4%A; path=/'; }, returning: false },
];

describe('homepage tree predicate — script and runtime agree', () => {
  beforeEach(() => {
    localStorage.clear();
    clearCookies();
    document.documentElement.removeAttribute('data-home');
  });

  it.each(FIXTURES)('$name', ({ setup, returning }) => {
    setup();
    expect(isReturningVisitor()).toBe(returning);
    expect(runScript()).toBe(returning ? 'returning' : 'fresh');
  });

  it('hasSupabaseSession ignores the onboarding flag (session only)', () => {
    localStorage.setItem('lexiclash_onboarding_completed', 'true');
    expect(hasSupabaseSession()).toBe(false);
    localStorage.setItem('sb-x-auth-token', LIVE);
    expect(hasSupabaseSession()).toBe(true);
  });

  it('script never contains a closing script tag', () => {
    expect(HOME_TREE_SCRIPT.toLowerCase()).not.toContain('</script');
  });
});

describe('HomeTreeSlot', () => {
  it('server pass renders BOTH trees live (CSS picks before paint)', () => {
    const html = renderToString(
      <>
        <HomeTreeSlot tree="ssr" which="fresh"><p>fresh-content</p></HomeTreeSlot>
        <HomeTreeSlot tree="ssr" which="returning"><p>returning-content</p></HomeTreeSlot>
      </>
    );
    expect(html).toContain('fresh-content');
    expect(html).toContain('returning-content');
    expect(html).toContain('data-home-tree="fresh"');
    expect(html).toContain('data-home-tree="returning"');
  });

  it('client renders only the selected tree live; the other is an inert wrapper', () => {
    const { container } = render(
      <>
        <HomeTreeSlot tree="fresh" which="fresh"><p>fresh-content</p></HomeTreeSlot>
        <HomeTreeSlot tree="fresh" which="returning"><p>returning-content</p></HomeTreeSlot>
      </>
    );
    expect(container.textContent).toContain('fresh-content');
    expect(container.textContent).not.toContain('returning-content');
    expect(container.querySelector('[data-home-tree="returning"]')).not.toBeNull();
  });
});

describe('HomeTreeBoot', () => {
  it('server HTML carries the pre-paint script and the display rules', () => {
    const html = renderToString(<HomeTreeBoot />);
    expect(html).toContain('<script');
    expect(html).toContain('data-home');
    expect(html).toMatch(/html\[data-home=["']?returning["']?\]/);
  });

  it('a client (non-hydration) render emits no script tag', () => {
    const { container } = render(<HomeTreeBoot />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('style')).not.toBeNull();
  });
});
