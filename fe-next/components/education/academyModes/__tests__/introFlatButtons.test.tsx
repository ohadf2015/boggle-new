import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key), language: 'en' }),
}));
vi.mock('@/hooks/useReducedEffects', () => ({ useReducedEffects: () => [false, () => {}] }));
vi.mock('@/components/Avatar', () => ({ default: () => null }));

import { WorkshopVsIntro } from '../WorkshopVsIntro';
import { ReviewVaultIntro } from '../ReviewVaultIntro';
import ReviewCardView from '../ReviewCardView';
import { LessonWordTile } from '../WorkshopPanels';
import { WorkshopBoardSkin } from '../WorkshopSkin';
import type { ReviewCard } from '@/lib/education/missedWordsReview';

const noop = () => {};

function expectFlatLime(el: HTMLElement) {
  expect(el.getAttribute('style') ?? '').not.toMatch(/gradient/);
  expect(el).toHaveClass('bg-neo-lime', 'shadow-edu-lip', 'active:translate-y-[3px]');
}

describe('academy intro buttons are flat classroom buttons', () => {
  it('Crack the vault is a solid lime button with a black lip', () => {
    render(<ReviewVaultIntro lessonName="Weather" words={['rain']} onStart={noop} />);
    expectFlatLime(screen.getByTestId('review-start'));
  });

  it('Battle is a solid lime button, and the gold lesson words are flat yellow chips', () => {
    render(<WorkshopVsIntro lessonName="Weather" chips={['rain', 'snow']} starting={false} startFailed={false} onPlay={noop} />);
    expectFlatLime(screen.getByTestId('workshop-play'));
    for (const chip of screen.getAllByTestId('workshop-lesson-word')) {
      expect(chip.getAttribute('style') ?? '').not.toMatch(/gradient/);
      expect(chip).toHaveClass('bg-neo-yellow');
    }
  });

  it('review letter tiles and their card are flat, with no glow', () => {
    const card = { word: 'rain', definition: 'water from clouds', language: 'en', id: 'c1', kind: 'unscramble', tiles: ['r', 'a', 'i', 'n'] } as unknown as ReviewCard;
    const { container } = render(<ReviewCardView card={card} answered={false} correct={null} onAnswer={noop} />);
    for (const tile of screen.getAllByTestId('review-tile')) {
      expect(tile.getAttribute('style') ?? '').not.toMatch(/gradient|rgba/);
    }
    for (const el of Array.from(container.querySelectorAll<HTMLElement>('[style]'))) {
      expect(el.getAttribute('style')).not.toMatch(/gradient/);
    }
  });

  it('workshop lesson word plaques are flat cream or yellow', () => {
    render(<ul><LessonWordTile word="rain" /><LessonWordTile word="snow" found /></ul>);
    for (const chip of screen.getAllByTestId('workshop-lesson-word')) {
      expect(chip.getAttribute('style') ?? '').not.toMatch(/gradient|rgba/);
    }
  });

  it('workshop board letter tiles, claims, gold cells and the score rope are flat fills', () => {
    const { container } = render(<WorkshopBoardSkin reduce />);
    const rules = (container.querySelector('style')?.textContent ?? '').split('}').filter((r) => /data-tile-state="(placed|pending)"|data-claim="|data-wk-gold|wc-bar-fill|cell-invite/.test(r));
    expect(rules.length).toBeGreaterThan(4);
    for (const rule of rules) expect(rule).not.toMatch(/gradient/);
  });
});
