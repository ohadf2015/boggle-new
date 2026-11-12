import React from 'react';
import { render, screen } from '@testing-library/react';
import { tMock } from './questTestMocks';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: tMock, language: 'en', dir: 'ltr' }),
}));
vi.mock('framer-motion', async () => (await import('./questTestMocks')).motionMock());
vi.mock('next/link', async () => (await import('./questTestMocks')).linkMock());
vi.mock('@/hooks/useReducedMotion', () => ({ __esModule: true, default: vi.fn(() => false) }));

import { DailyQuestCard } from '../DailyQuestCard';

const base = {
  titleKey: 'q.title',
  descKey: 'q.desc',
  href: '/brain',
  type: 'playMode' as const,
  mode: 'brain' as const,
  xpReward: 100,
  index: 0,
};

describe('DailyQuestCard', () => {
  it('given an open quest, then it links with the locale, shows GO, XP and the mode sticker', () => {
    render(<DailyQuestCard {...base} completed={false} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/en/brain');
    expect(link.getAttribute('aria-label')).toBe('q.title');
    expect(screen.getByText('quests.go')).toBeInTheDocument();
    expect(screen.getByText('quests.reward.xp|100')).toBeInTheDocument();
    expect(screen.getByText('q.desc')).toBeInTheDocument();
    expect(screen.getByTestId('quest-card-art').getAttribute('src')).toContain('/quests/brain.webp');
    expect(screen.queryByTestId('quest-card-stamp')).toBeNull();
  });

  it('given a completed quest, then a done stamp and check badge replace GO and text stays plain', () => {
    render(<DailyQuestCard {...base} completed />);
    expect(screen.queryByText('quests.go')).toBeNull();
    expect(screen.getByTestId('quest-card-stamp')).toHaveTextContent('quests.done');
    expect(screen.getByTestId('quest-card-check')).toBeInTheDocument();
    expect(screen.getByRole('link').getAttribute('aria-label')).toBe('q.title - quests.done');
    expect(screen.getByText('q.title').className).not.toMatch(/line-through|opacity/);
  });
});
