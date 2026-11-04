import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Achievement } from '@/components/education/achievements/AchievementGrid';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he' }),
}));
vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({ useEduReducedMotion: () => true }));
vi.mock('@/components/student/pages/AwardsWall', () => ({
  AwardsGrid: () => <div data-testid="awards-grid" />,
}));

import { AwardsBody } from '../AwardsBody';

const earned: Achievement = { count: 3, category: 'progress', icon: '⭐', nameKey: 'n', descriptionKey: 'd', isSecret: false };

describe('AwardsBody empty state', () => {
  it('given no awards at all, when rendered, then a mascot and one play-a-lesson CTA replace the bare line', () => {
    render(<AwardsBody achievements={{}} filter="all" />);
    const empty = screen.getByTestId('awards-empty');
    expect(empty.querySelector('img')).toHaveAttribute('src', expect.stringContaining('edu-empty'));
    const cta = screen.getByRole('link', { name: 'academy.pages.awardsEmptyCta' });
    expect(cta).toHaveAttribute('href', '/he/student');
    expect(screen.queryByTestId('awards-grid')).not.toBeInTheDocument();
  });

  it('given awards, when rendered, then the wall shows and no empty state', () => {
    render(<AwardsBody achievements={{ x: earned }} filter="all" />);
    expect(screen.getByTestId('awards-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('awards-empty')).not.toBeInTheDocument();
  });
});
