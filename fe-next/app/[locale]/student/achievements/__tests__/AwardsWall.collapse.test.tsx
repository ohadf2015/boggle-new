import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Achievement } from '@/components/education/achievements/AchievementGrid';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, f?: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));
vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({ useEduReducedMotion: () => true }));

import { AwardsGrid } from '@/components/student/pages/AwardsWall';
import { AwardsHero } from '../AwardsHero';

const a = (count: number, descriptionKey = 'd'): Achievement => ({ count, category: 'progress', icon: '⭐', nameKey: 'n', descriptionKey, isSecret: false });

describe('Awards wall', () => {
  it('given nothing earned, when rendered, then no locked tile shows until the student opens the rest', () => {
    render(<AwardsGrid achievements={{ first_lesson: a(0), lesson_collector: a(0) }} filter="all" />);
    expect(screen.queryAllByTestId('student-award')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /awardsShowMore/ }));
    expect(screen.getAllByTestId('student-award')).toHaveLength(2);
  });

  it('given a locked award, when opened, then it says in words how to earn it', () => {
    render(<AwardsGrid achievements={{ first_lesson: a(0, 'achievements.first_lesson.description') }} filter="all" />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('award-how')).toHaveTextContent('achievements.first_lesson.description');
  });

  it('given an earned award not seen before, when rendered, then it wears a New chip, and only that one', () => {
    render(<AwardsGrid achievements={{ first_lesson: a(1), word_master: a(60) }} filter="all" fresh={new Set(['first_lesson'])} />);
    expect(screen.getAllByTestId('award-new')).toHaveLength(1);
  });

  it('given xp_collector at 264, when rendered earned, then it is not shown as a finished tier', () => {
    render(<AwardsGrid achievements={{ xp_collector: a(264), first_lesson: a(3) }} filter="all" />);
    expect(screen.getAllByTestId('student-award')).toHaveLength(1);
  });

  it('given a hero, when rendered, then the lead Next up explains how to earn it', () => {
    render(<AwardsHero achievements={{ first_lesson: a(0, 'achievements.first_lesson.description'), word_master: a(0) }} />);
    expect(screen.getByTestId('awards-next-how')).toHaveTextContent('achievements.first_lesson.description');
  });
});
