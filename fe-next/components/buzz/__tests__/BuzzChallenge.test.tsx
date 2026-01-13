/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BuzzChallenge from '../BuzzChallenge';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock fetch
global.fetch = jest.fn();

// Mock framer-motion with all elements used by NeoLoader
jest.mock('framer-motion', () => {
  const stripFramerProps = (props: Record<string, unknown>) => {
    const { whileHover, whileTap, animate, initial, exit, transition, variants, ...rest } = props;
    return rest;
  };
  return {
    motion: {
      div: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) => <div {...stripFramerProps(props)}>{children}</div>,
      p: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) => <p {...stripFramerProps(props)}>{children}</p>,
    },
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  };
});

// Mock translations
jest.mock('@/contexts/LanguageContext', () => ({
  ...jest.requireActual('@/contexts/LanguageContext'),
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: jest.fn(),
  }),
}));

// Mock auth
jest.mock('@/contexts/AuthContext', () => ({
  ...jest.requireActual('@/contexts/AuthContext'),
  useAuth: () => ({
    profile: null,
    isAuthenticated: false,
  }),
}));

// Mock child components
jest.mock('../BuzzReadyScreen', () => ({
  __esModule: true,
  default: () => <div data-testid="buzz-ready-screen">Ready Screen</div>,
}));

jest.mock('../BuzzGameScreen', () => ({
  __esModule: true,
  default: () => <div data-testid="buzz-game-screen">Game Screen</div>,
}));

jest.mock('../BuzzResultsScreen', () => ({
  __esModule: true,
  default: () => <div data-testid="buzz-results-screen">Results Screen</div>,
}));

describe('BuzzChallenge', () => {
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('shows loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        })
    );

    render(
      <LanguageProvider>
        <AuthProvider>
          <BuzzChallenge language="en" onBack={mockOnBack} />
        </AuthProvider>
      </LanguageProvider>
    );

    expect(screen.getByText(/buzz.loading|Loading Daily Buzz/i)).toBeInTheDocument();
  });

  it('fetches daily buzz challenge on mount', async () => {
    const mockChallengeData = {
      id: 1,
      puzzleDate: '2026-01-13',
      language: 'en',
      trendingSummary: 'Test trends',
      trendingTopics: [{ query: 'Test topic' }],
      challenges: [
        {
          type: 'scrambled',
          trendTopic: 'Test',
          prompt: 'Unscramble: TSET',
          answer: 'TEST',
          difficulty: 'easy',
        },
      ],
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockChallengeData }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ played: false }),
      });

    render(
      <LanguageProvider>
        <AuthProvider>
          <BuzzChallenge language="en" onBack={mockOnBack} />
        </AuthProvider>
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/buzz/')
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('buzz-ready-screen')).toBeInTheDocument();
    });
  });

  it('shows error state when fetch fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(
      <LanguageProvider>
        <AuthProvider>
          <BuzzChallenge language="en" onBack={mockOnBack} />
        </AuthProvider>
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/buzz.error|Oops!/i)).toBeInTheDocument();
    });
  });

  it('calls onBack when error back button is clicked', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(
      <LanguageProvider>
        <AuthProvider>
          <BuzzChallenge language="en" onBack={mockOnBack} />
        </AuthProvider>
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/buzz.error|Oops!/i)).toBeInTheDocument();
    });

    const backButton = screen.getByText(/common.back|Go Back/i);
    backButton.click();

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });
});
