/**
 * DuelGamePageClient Tests
 * Tests for the duel game page component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DuelGamePageClient from '../PageClient';

// Mock dependencies
const mockGetDuelById = vi.fn();
const mockGetProfile = vi.fn();
const mockPush = vi.fn();

vi.mock('@/lib/supabase/education/duels', () => ({
  getDuelById: (...args: unknown[]) => mockGetDuelById(...args),
}));

vi.mock('@/lib/supabase', () => ({
  getProfile: (...args: unknown[]) => mockGetProfile(...args),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'student-1', email: 'test@example.com' },
    isAuthenticated: true,
    loading: false,
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock child components to avoid rendering complexity
vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div data-testid="education-header" />,
}));

vi.mock('@/components/education/duels', () => ({
  DuelGameView: () => <div data-testid="duel-game-view" />,
  RealTimeDuelGame: () => <div data-testid="real-time-duel-game" />,
}));

describe('DuelGamePageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading spinner while verifying duel', () => {
    mockGetDuelById.mockReturnValueOnce(
      new Promise(() => {}) // Never resolves
    );

    render(<DuelGamePageClient duelId="duel-1" />);

    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  it('should render duel game view when duel is verified', async () => {
    mockGetDuelById.mockResolvedValueOnce({
      data: {
        id: 'duel-1',
        challenger_id: 'student-2',
        opponent_id: 'student-1',
        duel_type: 'async',
      },
      error: null,
    });

    mockGetProfile.mockResolvedValueOnce({
      data: { display_name: 'Opponent Name' },
      error: null,
    });

    render(<DuelGamePageClient duelId="duel-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('duel-game-view')).toBeInTheDocument();
    });
  });

  it('should show error when getDuelById rejects (defect fix test)', async () => {
    // RED: Before fix, this will hang with loading spinner. After fix, it should show error.
    mockGetDuelById.mockRejectedValueOnce(new Error('Network error'));

    render(<DuelGamePageClient duelId="duel-1" />);

    // Wait for the rejection to settle
    await waitFor(() => {
      // The loader should disappear after the error
      expect(screen.queryByText('common.loading')).not.toBeInTheDocument();

      // The error state should appear instead
      expect(screen.getByText('duelNotFound')).toBeInTheDocument();
    });
  });

  it('should show error when getProfile rejects', async () => {
    mockGetDuelById.mockResolvedValueOnce({
      data: {
        id: 'duel-1',
        challenger_id: 'student-2',
        opponent_id: 'student-1',
        duel_type: 'async',
      },
      error: null,
    });

    mockGetProfile.mockRejectedValueOnce(new Error('Profile fetch failed'));

    render(<DuelGamePageClient duelId="duel-1" />);

    // Wait for the rejection to settle
    await waitFor(() => {
      // The loader should disappear after the error
      expect(screen.queryByText('common.loading')).not.toBeInTheDocument();

      // The error state should appear instead
      expect(screen.getByText('duelNotFound')).toBeInTheDocument();
    });
  });
});
