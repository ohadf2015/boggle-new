import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';

const params = vi.hoisted(() => ({ state: 'wrong', host: null as string | null }));
vi.mock('next/navigation', () => ({ useSearchParams: () => ({ get: (k: string) => (k === 'state' ? params.state : k === 'host' ? params.host : null) }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playSound: vi.fn() }) }));

import { StudentQuizPreview } from '../StudentQuizPreview';

describe('StudentQuizPreview (dev harness for phone screenshots)', () => {
  it('replays a question and a missed reveal through the real VocabQuizView', async () => {
    render(<StudentQuizPreview />);
    expect(await screen.findByTestId('vocab-quiz-verdict')).toBeInTheDocument();
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(4);
  });

  it('shows the open question with no verdict', async () => {
    params.state = 'question';
    render(<StudentQuizPreview />);
    expect(await screen.findByText('fragile')).toBeInTheDocument();
    expect(screen.queryByTestId('vocab-quiz-verdict')).toBeNull();
  });

  it('state=swap plays two reveals on the wall so the standings visibly reorder', async () => {
    vi.useFakeTimers();
    params.state = 'swap';
    params.host = '1';
    render(<StudentQuizPreview />);
    for (const step of [10, 1600, 1500, 1000]) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(step);
      });
    }
    expect(screen.getAllByTestId('vq-rail-row')[0]).toHaveAttribute('data-username', 'Leo');
    expect(screen.getByTestId('vq-rail-up')).toBeInTheDocument();
    expect(screen.getByTestId('vq-rail-close')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
