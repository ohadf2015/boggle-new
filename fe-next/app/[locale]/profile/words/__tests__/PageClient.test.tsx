import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPush = vi.fn();
const mockWrite = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => key,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    isAuthenticated: true,
    loading: false,
  }),
}));

vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({ variant: 'enabled', trackExposure: vi.fn() }),
}));

vi.mock('@/lib/wordMastery/isEnabled', () => ({
  isWordMasteryEnvEnabled: () => true,
  resolveWordMasteryAccess: () => true,
}));

vi.mock('@/lib/wordMastery/practiceStorage', () => ({
  writeMasteryPracticeRound: (...args: unknown[]) => mockWrite(...args),
}));

vi.mock('@/components/Header', () => ({
  default: () => <div data-testid="header" />,
}));

import WordMasteryPageClient from '../PageClient';

describe('WordMasteryPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('shouldRenderMasteredAndLearningFromApi', async () => {
    // GIVEN
    vi.mocked(global.fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/practice')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ grid: [['Q', 'U'], ['I', 'Z']], seedWords: ['quiz'] }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          mastered: [{ word: 'dog', score: 90, language: 'en' }],
          learning: [{ word: 'quiz', score: 20, language: 'en' }],
        }),
      } as Response;
    });

    // WHEN
    render(<WordMasteryPageClient />);

    // THEN
    expect(await screen.findByText('dog')).toBeInTheDocument();
    expect(screen.getByText('quiz')).toBeInTheDocument();
  });

  it('shouldStartPracticeRoundFromCta', async () => {
    // GIVEN
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/practice')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            grid: [['Q', 'U'], ['I', 'Z']],
            seedWords: ['quiz'],
          }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          mastered: [],
          learning: [{ word: 'quiz', score: 20, language: 'en' }],
        }),
      } as Response;
    });

    render(<WordMasteryPageClient />);
    expect(await screen.findByText('quiz')).toBeInTheDocument();

    // WHEN
    await user.click(screen.getByRole('button', { name: 'wordMastery.practiceCta' }));

    // THEN
    await waitFor(() => {
      expect(mockWrite).toHaveBeenCalledWith({
        grid: [['Q', 'U'], ['I', 'Z']],
        seedWords: ['quiz'],
      });
      expect(mockPush).toHaveBeenCalledWith('/en/singleplayer?autoStart=practice&mastery=1');
    });
  });
});
