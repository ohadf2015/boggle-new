/**
 * Piece A (shell), round 4 (third run) + round 5 (fourth run): the page ends
 * on ONE strong beat, and nothing reference-like trails after it.
 *
 * Round 4 (third run) critic: "end on a single strong emotional beat like the
 * mascot 'see you on the board' moment instead of trailing into a link
 * directory". That round grew a mascot sign-off under the FAQ. Round 5 (fourth
 * run) critic: the big CTA block "reads like the finale", yet the page kept
 * going after it. So the sign-off and the close are now ONE finale (the lime
 * PLAY band with the waving mascot), rendered LAST by HomepageContentSection:
 * the "FreshSignOff is a finale" guards (mascot at hero-art scale, decorative
 * alt, motion-safe moves) moved to fresh.shell.ending.test with the finale.
 *
 * The reference section above the finale (how to play, blog, FAQ) reads as
 * one column: the LandingView tail and HomepageContentSection share one width
 * and one start edge, instead of a centered block over start-aligned blocks.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { LandingSEOSection } from '../LandingSEOSection';

vi.mock('next/navigation', () => ({ useParams: () => ({ locale: 'en' }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

describe('the reference tail layout', () => {
  // Was: "LandingView tail and HomepageContentSection share one width" (both
  // max-w-3xl: one quiet fine-print column). Superseded in round 6: the critic
  // read that column as an SEO dump for the fifth time and the lead asked for
  // a fundamentally different approach, so How to Play is now a section at the
  // story width of sections 2-6 (max-w-6xl, fresh.shell.r6.blog.test) and the
  // FAQ is one centered card that keeps the max-w-3xl column.
  it('How to Play spans the story width; the FAQ card keeps a centered max-w-3xl column', () => {
    const view = read('landing/LandingView.tsx');
    const faq = read('seo/HomepageContentSection.tsx');
    expect(view).toMatch(/data-home-tail="tail"[\s\S]{0,200}max-w-6xl/);
    expect(faq).toMatch(/<section\s+aria-label=\{l\.about\}[\s\S]{0,200}max-w-3xl/);
    expect(view).not.toMatch(/max-w-5xl/);
    expect(faq).not.toMatch(/max-w-5xl/);
  });

  it('keeps the bottom-safe reserve at the end of the page, not between blog and FAQ', () => {
    expect(read('landing/LandingView.tsx')).not.toMatch(/className="[^"]*\bpage-content-safe\b/);
    expect(read('seo/HomepageContentSection.tsx')).toMatch(/className="[^"]*\bpage-content-safe\b/);
  });

  it('How to Play starts on the same edge as the blog and FAQ (not centered)', () => {
    const { container } = render(<LandingSEOSection />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toMatch(/\btext-center\b|\bitems-center\b/);
    const list = container.querySelector('ol') as HTMLElement;
    expect(list.className).not.toMatch(/md:text-center/);
  });

  // Was: "packs the four steps two-up at phone width" (a 2x2 grid of small
  // outline icons). Superseded in round 6: the steps are the hero's tiles on a
  // lime trace path (fresh.shell.r6.howToPlay.test), one per row down the
  // path on a phone and four across at md.
  it('lays the four steps one per row on a phone and four across at md', () => {
    const { container } = render(<LandingSEOSection />);
    const list = container.querySelector('ol') as HTMLElement;
    expect(list.className).toMatch(/(^|\s)grid-cols-1(\s|$)/);
    expect(list.className).toMatch(/(^|\s)md:grid-cols-4(\s|$)/);
  });
});
