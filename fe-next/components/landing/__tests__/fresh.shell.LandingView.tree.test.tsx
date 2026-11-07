/**
 * LandingView renders one play-first home for every visitor. The pre-paint
 * script still marks returning visitors and the native app (html[data-home]),
 * which hides the SEO tail and footer for them.
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
vi.mock('@/components/home-preview/HomePreview', () => ({
  HomePreview: ({ onPlay }: { onPlay?: () => void }) => (
    <div data-testid="home-preview" data-has-play={onPlay ? 'yes' : 'no'} />
  ),
}));
vi.mock('../LandingSEOSection', () => ({ LandingSEOSection: () => <section data-testid="seo" /> }));
vi.mock('../LandingBlogSection', () => ({ LandingBlogSection: () => <section data-testid="blog" /> }));

describe('LandingView home', () => {
  beforeEach(() => {
    completed = false;
    document.documentElement.removeAttribute('data-home');
  });

  it.each([
    [false, 'fresh'],
    [true, 'returning'],
  ])('given onboarding completed=%s, then the same home renders and html is marked %s', (c, tree) => {
    completed = c;
    const { getAllByTestId } = render(<LandingView />);
    expect(getAllByTestId('home-preview')).toHaveLength(1);
    expect(document.documentElement.getAttribute('data-home')).toBe(tree);
  });

  it('passes onStartOnboarding through to the home PLAY', () => {
    const { getByTestId } = render(<LandingView onStartOnboarding={() => {}} />);
    expect(getByTestId('home-preview').getAttribute('data-has-play')).toBe('yes');
  });

  it('SEO and blog render once for either visitor', () => {
    for (const c of [false, true]) {
      completed = c;
      const { getAllByTestId, unmount } = render(<LandingView />);
      expect(getAllByTestId('seo')).toHaveLength(1);
      expect(getAllByTestId('blog')).toHaveLength(1);
      unmount();
    }
  });

  it('pre-paint script precedes the home in the HTML', () => {
    const html = renderToString(<LandingView />);
    const script = html.indexOf('<script');
    const home = html.indexOf('data-testid="home-preview"');
    expect(script).toBeGreaterThan(-1);
    expect(home).toBeGreaterThan(script);
  });
});
