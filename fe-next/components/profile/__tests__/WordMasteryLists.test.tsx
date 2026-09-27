import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WordMasteryLists } from '../WordMasteryLists';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const table: Record<string, string> = {
        'wordMastery.mastered': 'Mastered',
        'wordMastery.learning': 'Learning',
        'wordMastery.emptyMastered': 'No mastered words yet.',
        'wordMastery.emptyLearning': 'No learning words yet.',
        'wordMastery.emptyAll': 'Play a few rounds to start tracking.',
        'wordMastery.practiceCta': 'Practice these',
        'wordMastery.practiceHint': 'Start a custom round with your weakest words.',
        'wordMastery.count': '{count} words',
      };
      const raw = table[key] || key;
      if (!params) return raw;
      return Object.entries(params).reduce(
        (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
        raw,
      );
    },
  }),
}));

describe('WordMasteryLists', () => {
  it('shouldRenderMasteredAndLearningWords', () => {
    // GIVEN
    render(
      <WordMasteryLists
        mastered={[{ word: 'dog', score: 90, language: 'en' }]}
        learning={[{ word: 'quiz', score: 20, language: 'en' }]}
        onPractice={() => {}}
        practiceDisabled={false}
        practiceLoading={false}
      />,
    );

    // THEN
    expect(screen.getByText('dog')).toBeInTheDocument();
    expect(screen.getByText('quiz')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Practice these' })).toBeEnabled();
  });

  it('shouldShowEmptyCopyWhenNoWords', () => {
    // GIVEN
    render(
      <WordMasteryLists
        mastered={[]}
        learning={[]}
        onPractice={() => {}}
        practiceDisabled
        practiceLoading={false}
      />,
    );

    // THEN
    expect(screen.getByText('Play a few rounds to start tracking.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Practice these' })).toBeDisabled();
  });

  it('shouldCallOnPracticeWhenCtaClicked', async () => {
    // GIVEN
    const onPractice = vi.fn();
    const user = userEvent.setup();
    render(
      <WordMasteryLists
        mastered={[]}
        learning={[{ word: 'quiz', score: 20, language: 'en' }]}
        onPractice={onPractice}
        practiceDisabled={false}
        practiceLoading={false}
      />,
    );

    // WHEN
    await user.click(screen.getByRole('button', { name: 'Practice these' }));

    // THEN
    expect(onPractice).toHaveBeenCalledTimes(1);
  });
});
