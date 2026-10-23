/**
 * The story beats are tiles on one board (DESIGN.md, marketing surfaces): the
 * room each beat needs lives inside its tile, so the page no longer pays for a
 * phone screen of empty navy between beats.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { FreshSection } from '../fresh/FreshSection';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

function sectionClass(): string {
  const { container } = render(
    <FreshSection id="daily" accent="cyan" title="t" line="l" art={<div />} link={{ href: '/en/daily', label: 'go' }} />
  );
  return (container.querySelector('section') as HTMLElement).className;
}

describe('story beats sit on one board', () => {
  it('makes each beat a tile: mode-colour border, hard shadow, padded inside instead of between', () => {
    const cls = sectionClass();
    expect(cls).toMatch(/(^|\s)border-neo-cyan(\s|$)/);
    expect(cls).toMatch(/(^|\s)shadow-hard-xl(\s|$)/);
    expect(cls).not.toMatch(/(^|\s)md:py-40(\s|$)/);
  });

  it('sets the beat headline in the poster face', () => {
    const { container } = render(
      <FreshSection id="daily" accent="cyan" title="t" line="l" art={<div />} />
    );
    const h2 = container.querySelector('h2') as HTMLElement;
    expect(h2.className).toMatch(/(^|\s)font-neo-poster(\s|$)/);
  });

  it('puts daily and friends side by side on one grid, not alternating rows', () => {
    const page = read('landing/fresh/FreshPage.tsx');
    expect(page).toMatch(/data-fresh-board[\s\S]{0,300}md:grid-cols-12[\s\S]{0,200}<FreshDaily \/>\s*<FreshFriends \/>/);
    expect(read('landing/fresh/FreshDaily.tsx')).toMatch(/md:col-span-7/);
    expect(read('landing/fresh/FreshFriends.tsx')).toMatch(/md:col-span-5/);
  });

  it('keeps How to Play and the FAQ board as one reference beat: tight seam, breath after', () => {
    const view = read('landing/LandingView.tsx');
    const faq = read('seo/HomepageContentSection.tsx');
    expect(view).toMatch(/data-home-tail="tail"[\s\S]{0,200}\bpb-8\b/);
    expect(faq).toMatch(/<section\s+aria-label=\{l\.about\}[\s\S]{0,250}\bpb-12\b[\s\S]{0,120}md:pb-16/);
  });
});

describe('the fresh page is a few beats, not a feature list', () => {
  // Lead decision: mode cards were the homepage's most-clicked CTA (115 users/30d),
  // so the modes row stays as the "explore" beat; languages stays cut (header switcher).
  it('mounts the modes row but not the languages section', () => {
    const src = read('landing/fresh/FreshPage.tsx');
    expect(src).toMatch(/<ModeRow\s*\/>/);
    expect(src).not.toMatch(/<FreshLanguages\b/);
  });

  it('keeps the in-content ad slot (moved, never deleted)', () => {
    expect(read('landing/fresh/FreshPage.tsx')).toMatch(/<FreshAdSlot\s*\/>/);
  });
});
