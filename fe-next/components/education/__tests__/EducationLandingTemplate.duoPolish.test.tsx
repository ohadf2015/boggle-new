import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ReactElement } from 'react';
import SightWords from '@/app/[locale]/education/sight-words-practice/page';
import EslWordGames from '@/app/[locale]/education/esl-word-games/page';
import { getEslWordGamesLanding } from '@/app/[locale]/education/esl-word-games/landing';
import { getSightWordsLanding } from '@/app/[locale]/education/sight-words-practice/landing';
import { splitLead } from '@/components/landing/splitLead';

type PageFn = (p: { params: Promise<{ locale: string }> }) => Promise<unknown>;
const renderPage = async (page: PageFn) =>
  render((await page({ params: Promise.resolve({ locale: 'en' }) })) as ReactElement);

describe('education SEO landing template, Duolingo polish', () => {
  it('opens on the H1: no image banner restating it above', async () => {
    const { container } = await renderPage(EslWordGames as PageFn);
    expect(container.querySelector('img[src*="education-hero"]')).toBeNull();
    expect(container.querySelector('h1, h2')?.tagName).toBe('H1');
  });

  it('says the hero subtitle once when the banner only echoed it', async () => {
    const { container } = await renderPage(EslWordGames as PageFn);
    for (const part of splitLead(getEslWordGamesLanding('en').hero.subtitle).filter(Boolean)) {
      expect(container.textContent!.split(part!).length - 1).toBe(1);
    }
  });

  it('keeps a banner line that is its own copy, below the hero', async () => {
    const { container } = await renderPage(SightWords as PageFn);
    const banner = getSightWordsLanding('en').heroBanner!;
    const text = container.textContent!;
    expect(text).toContain(banner.subtitle!);
    expect(text.indexOf(banner.subtitle!)).toBeGreaterThan(text.indexOf(container.querySelector('h1')!.textContent!));
  });

  it('hero primary CTA uses the chunky press', async () => {
    const { container } = await renderPage(EslWordGames as PageFn);
    const primary = container.querySelector<HTMLElement>('[data-hero-primary]')!;
    expect(primary).toBeInTheDocument();
    fireEvent.pointerDown(primary, { button: 0 });
    expect(primary).toHaveAttribute('data-pressed', 'true');
  });
});
