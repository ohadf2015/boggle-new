/**
 * Piece A (shell): LandingView renders the fresh page for fresh visitors and
 * today's tree for returning users. The server emits both (CSS + a pre-paint
 * script choose); the client mounts only the chosen one, so a fresh visitor
 * never runs the returning tree's data hooks, ads or music.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import LandingView from '../LandingView';

let completed = false;
vi.mock('@/utils/onboardingStorage', () => ({
  hasCompletedOnboarding: () => completed,
  hasSupabaseSession: () => false,
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/components/Header', () => ({ default: () => <header data-testid="header" /> }));
vi.mock('../ReturningHome', () => ({ ReturningHome: () => <div data-testid="returning-home" /> }));
vi.mock('../fresh/FreshPage', () => ({
  FreshPage: ({ onPlay }: { onPlay?: () => void }) => (
    <div data-testid="fresh-page" data-has-play={onPlay ? 'yes' : 'no'} />
  ),
}));
vi.mock('../LandingSEOSection', () => ({ LandingSEOSection: () => <section data-testid="seo" /> }));
vi.mock('../LandingBlogSection', () => ({ LandingBlogSection: () => <section data-testid="blog" /> }));

describe('LandingView tree selection', () => {
  beforeEach(() => {
    completed = false;
    document.documentElement.removeAttribute('data-home');
  });

  it('fresh visitor: mounts FreshPage, leaves the returning tree inert', () => {
    const { queryByTestId } = render(<LandingView />);
    expect(queryByTestId('fresh-page')).not.toBeNull();
    expect(queryByTestId('returning-home')).toBeNull();
    expect(document.documentElement.getAttribute('data-home')).toBe('fresh');
  });

  it('returning visitor: mounts the returning tree, leaves FreshPage inert', () => {
    completed = true;
    const { queryByTestId } = render(<LandingView />);
    expect(queryByTestId('returning-home')).not.toBeNull();
    expect(queryByTestId('fresh-page')).toBeNull();
    expect(document.documentElement.getAttribute('data-home')).toBe('returning');
  });

  it('passes onStartOnboarding through to the fresh PLAY', () => {
    const { getByTestId } = render(<LandingView onStartOnboarding={() => {}} />);
    expect(getByTestId('fresh-page').getAttribute('data-has-play')).toBe('yes');
  });

  it('SEO and blog render once, outside both trees, for either visitor', () => {
    for (const c of [false, true]) {
      completed = c;
      const { getAllByTestId, unmount } = render(<LandingView />);
      expect(getAllByTestId('seo')).toHaveLength(1);
      expect(getAllByTestId('blog')).toHaveLength(1);
      unmount();
    }
  });

  it('pre-paint script precedes both tree wrappers in the HTML', () => {
    const html = renderToString(<LandingView />);
    const script = html.indexOf('<script');
    expect(script).toBeGreaterThan(-1);
    const fresh = html.indexOf('<div data-home-tree="fresh"');
    const returning = html.indexOf('<div data-home-tree="returning"');
    expect(fresh).toBeGreaterThan(-1);
    expect(returning).toBeGreaterThan(-1);
    expect(script).toBeLessThan(fresh);
    expect(script).toBeLessThan(returning);
  });
});
