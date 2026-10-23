import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const params = vi.hoisted(() => ({ state: 'wrong' }));
vi.mock('next/navigation', () => ({ useSearchParams: () => ({ get: (k: string) => (k === 'state' ? params.state : null) }) }));
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
});
