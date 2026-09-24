/**
 * Piece A (shell), round 7: every surviving beat gets real room to breathe.
 *
 * Blind critic (round 6): "Too many one-off sections stacked with no room to
 * breathe ... give each surviving section real vertical padding so it reads as
 * a single beat instead of a scrolling feature list."
 *
 * Round-6 story sections sat at py-14 on a phone (56px above and below): at
 * 390 the next headline arrived before the last visual had finished. Each
 * beat now owns close to a phone screen: generous padding, bigger art, and the
 * reference tail after it runs on the same cadence.
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

describe('story beats breathe', () => {
  it('pads each beat like a screen of its own: py-24 on a phone, md:py-40 on desktop', () => {
    const cls = sectionClass();
    expect(cls).toMatch(/(^|\s)py-24(\s|$)/);
    expect(cls).toMatch(/(^|\s)md:py-40(\s|$)/);
    expect(cls).not.toMatch(/(^|\s)py-14(\s|$)/);
  });

  it('gives copy and art a clear gap when stacked on a phone', () => {
    expect(sectionClass()).toMatch(/(^|\s)gap-12(\s|$)/);
  });

  it('sets the beat headline at display scale (text-4xl on a phone, md:text-5xl so a two-sentence headline breaks at its sentences in a half column)', () => {
    const { container } = render(
      <FreshSection id="daily" accent="cyan" title="t" line="l" art={<div />} />
    );
    const h2 = container.querySelector('h2') as HTMLElement;
    expect(h2.className).toMatch(/(^|\s)text-4xl(\s|$)/);
    expect(h2.className).toMatch(/(^|\s)md:text-5xl(\s|$)/);
    expect(h2.className).not.toMatch(/(^|\s)sm:text-/);
  });

  it('opens the reference beat with the same room as a story beat', () => {
    const view = read('landing/LandingView.tsx');
    expect(view).toMatch(/data-home-tail="tail"[\s\S]{0,200}pt-24[\s\S]{0,80}md:pt-40/);
  });

  // How to Play, the blog row and the FAQ card are ONE reference beat, not
  // three: the tail wrapper closes tight so the FAQ card follows it as part of
  // the same beat, and the beat's big breath comes after the FAQ, before the
  // finale.
  it('joins How to Play and the FAQ card into one beat: tight seam, big breath after', () => {
    const view = read('landing/LandingView.tsx');
    const faq = read('seo/HomepageContentSection.tsx');
    expect(view).toMatch(/data-home-tail="tail"[\s\S]{0,200}\bpb-8\b/);
    expect(faq).toMatch(/<section\s+aria-label=\{l\.about\}[\s\S]{0,200}\bpb-24\b[\s\S]{0,120}md:pb-40/);
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
