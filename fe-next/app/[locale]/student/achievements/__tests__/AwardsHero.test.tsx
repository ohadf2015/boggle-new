import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Achievement } from '@/components/education/achievements/AchievementGrid';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({ useEduReducedMotion: () => true }));

import { AwardsHero } from '../AwardsHero';

const a = (count: number, nameKey = 'n', isSecret = false): Achievement => ({
  count,
  category: 'progress',
  icon: '⭐',
  nameKey,
  descriptionKey: 'd',
  isSecret,
});

describe('AwardsHero', () => {
  it('given no achievements, when rendered, then it renders nothing', () => {
    const { container } = render(<AwardsHero achievements={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('given earned awards, when rendered, then it shows the earned count landed and the total', () => {
    render(<AwardsHero achievements={{ x: a(1), y: a(20), z: a(0) }} />);
    expect(screen.getByTestId('awards-hero-earned')).toHaveTextContent('2');
    expect(screen.getByTestId('awards-hero')).toHaveAttribute('data-total', '3');
  });

  it('given tier counts, when rendered, then each tier chip shows its count', () => {
    render(<AwardsHero achievements={{ x: a(1), y: a(20), z: a(400) }} />);
    expect(screen.getByTestId('awards-tier-BRONZE')).toHaveTextContent('1');
    expect(screen.getByTestId('awards-tier-SILVER')).toHaveTextContent('1');
    expect(screen.getByTestId('awards-tier-GOLD')).toHaveTextContent('0');
    expect(screen.getByTestId('awards-tier-PLATINUM')).toHaveTextContent('1');
  });

  it('given one award near its next tier, when rendered, then Next up names it with count over threshold', () => {
    render(<AwardsHero achievements={{ near: a(13, 'achievements.near.name'), far: a(2) }} />);
    const next = screen.getByTestId('awards-next');
    expect(next).toHaveTextContent('achievements.near.name');
    expect(next).toHaveTextContent('13 / 15');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '13');
  });

  it('given a next award, when rendered, then Next up sits inside the one summary card so the badge wall stays in view on a phone', () => {
    render(<AwardsHero achievements={{ near: a(13), far: a(2) }} />);
    const card = screen.getByTestId('awards-hero-card');
    expect(card).toContainElement(screen.getByTestId('awards-next'));
    expect(card).toContainElement(screen.getByTestId('awards-hero-earned'));
    expect(screen.getByTestId('awards-hero').querySelectorAll('[data-hero-card]')).toHaveLength(1);
  });

  it('given every award maxed, when rendered, then the all-maxed line sits inside the summary card', () => {
    render(<AwardsHero achievements={{ p: a(300) }} />);
    expect(screen.getByTestId('awards-hero-card')).toContainElement(screen.getByText('academy.pages.awardsAllMaxed'));
  });

  it('given every award maxed, when rendered, then the all-maxed line replaces Next up', () => {
    render(<AwardsHero achievements={{ p: a(300) }} />);
    expect(screen.queryByTestId('awards-next')).not.toBeInTheDocument();
    expect(screen.getByText('academy.pages.awardsAllMaxed')).toBeInTheDocument();
  });
});
