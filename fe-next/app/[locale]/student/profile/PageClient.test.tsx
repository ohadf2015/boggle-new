import { vi, type MockedFunction, type MockedClass, type Mock } from 'vitest';
/**
 * Tests for Student Profile Page
 * Enhanced with duel stats and recent activity
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StudentProfilePageClient from './PageClient';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentProgress } from '@/hooks/useStudentProgress';
import { getDuelStats, getDuelHistory } from '@/lib/supabase/education/duels';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import * as mockSupabase from '@/lib/supabase';

// Mock dependencies
vi.mock('@/contexts/AuthContext');
vi.mock('@/contexts/LanguageContext');
vi.mock('@/hooks/useStudentProgress');
vi.mock('@/lib/supabase/education/duels');
vi.mock('@/lib/supabase', () => ({
  supabase: null,
}));
vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div data-testid="education-header">EducationHeader</div>,
}));
vi.mock('@/components/education', () => ({
  EducationBadgeGrid: ({ achievements }: any) => (
    <div data-testid="badge-grid">
      {achievements.map((a: any) => (
        <div key={a.achievementKey}>{a.achievementKey}</div>
      ))}
    </div>
  ),
}));

const mockUseAuth = useAuth as MockedFunction<typeof useAuth>;
const mockUseLanguage = useLanguage as MockedFunction<typeof useLanguage>;
const mockUseStudentProgress = useStudentProgress as MockedFunction<typeof useStudentProgress>;
const mockGetDuelStats = getDuelStats as MockedFunction<typeof getDuelStats>;
const mockGetDuelHistory = getDuelHistory as MockedFunction<typeof getDuelHistory>;

describe('StudentProfilePageClient - Duel Features', () => {
  const mockUser = {
    id: 'user-123',
    email: 'student@test.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00Z',
  } as any;

  const mockProfile = {
    id: 'user-123',
    username: 'TestStudent',
    display_name: 'Test Student',
    avatar_emoji: '🎮',
    avatar_image: undefined,
  } as any;

  const mockLessons = [
    {
      lesson_id: 'lesson-1',
      progress: {
        student_id: 'user-123',
        lesson_id: 'lesson-1',
        total_xp: 500,
        current_streak: 3,
        words_mastered: ['word1', 'word2', 'word3'],
        total_practice_sessions: 10,
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      profile: mockProfile,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
    } as any);

    mockUseLanguage.mockReturnValue({
      t: (key: string) => key,
      language: 'en',
      setLanguage: vi.fn(),
      dir: 'ltr',
      currentFlag: '🇺🇸',
    } as any);

    mockUseStudentProgress.mockReturnValue({
      lessons: mockLessons as any,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    // Mock Supabase achievements query

    mockSupabase.supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: [
              {
                id: 'ach-1',
                student_id: 'user-123',
                current_tier: 'BRONZE',
                progress_value: 10,
                is_pinned: false,
                unlocked_at: '2024-01-01',
                achievement_definitions: {
                  key: 'first_word',
                  category: 'progress',
                  icon: '🎯',
                  is_secret: false,
                },
              },
            ],
            error: null,
          })),
        })),
      })),
    };
  });

  test('renders duel stats panel when duel data is available', async () => {
    // Mock duel stats with data
    mockGetDuelStats.mockResolvedValue({
      data: {
        wins: 10,
        losses: 5,
        draws: 2,
        winStreak: 3,
        currentStreak: 3,
        opponentStats: new Map(),
      },
      error: null,
    });

    mockGetDuelHistory.mockResolvedValue({
      data: [],
      error: null,
    });

    render(<StudentProfilePageClient />);

    // Wait for duel stats to load (async fetch)
    await waitFor(() => {
      expect(screen.getByText('duels.wins')).toBeInTheDocument();
    });

    expect(screen.getByText('student.profile.duelRecord')).toBeInTheDocument();
    expect(screen.getByText('duels.losses')).toBeInTheDocument();
    expect(screen.getByText('duels.draws')).toBeInTheDocument();

    // Check win rate calculation: 10 / (10 + 5 + 2) * 100 = 58.8%
    expect(screen.getByText(/58\.8/)).toBeInTheDocument();
  });

  test('renders recent duels section with last 5 duels', async () => {
    mockGetDuelStats.mockResolvedValue({
      data: {
        wins: 5,
        losses: 3,
        draws: 1,
        winStreak: 2,
        currentStreak: 1,
        opponentStats: new Map(),
      },
      error: null,
    });

    // Mock 5 duel history entries
    mockGetDuelHistory.mockResolvedValue({
      data: [
        {
          id: 'duel-1',
          challenger_id: 'user-123',
          opponent_id: 'opponent-1',
          classroom_id: 'class-1',
          lesson_id: 'lesson-1',
          duel_type: 'async',
          status: 'completed',
          board_state: null,
          challenger_score: 100,
          opponent_score: 80,
          winner_id: 'user-123',
          xp_awarded: true,
          created_at: '2024-01-01',
          started_at: '2024-01-01',
          completed_at: '2024-01-01',
          expires_at: null,
          challenger: {
            id: 'user-123',
            display_name: 'Test Student',
            avatar_url: null,
          },
          opponent: {
            id: 'opponent-1',
            display_name: 'Opponent One',
            avatar_url: null,
          },
          isWin: true,
        },
        {
          id: 'duel-2',
          challenger_id: 'opponent-2',
          opponent_id: 'user-123',
          classroom_id: 'class-1',
          lesson_id: 'lesson-1',
          duel_type: 'async',
          status: 'completed',
          board_state: null,
          challenger_score: 120,
          opponent_score: 90,
          winner_id: 'opponent-2',
          xp_awarded: true,
          created_at: '2024-01-02',
          started_at: '2024-01-02',
          completed_at: '2024-01-02',
          expires_at: null,
          challenger: {
            id: 'opponent-2',
            display_name: 'Opponent Two',
            avatar_url: null,
          },
          opponent: {
            id: 'user-123',
            display_name: 'Test Student',
            avatar_url: null,
          },
          isWin: false,
        },
        {
          id: 'duel-3',
          challenger_id: 'user-123',
          opponent_id: 'opponent-3',
          classroom_id: 'class-1',
          lesson_id: 'lesson-1',
          duel_type: 'async',
          status: 'completed',
          board_state: null,
          challenger_score: 100,
          opponent_score: 100,
          winner_id: null,
          xp_awarded: false,
          created_at: '2024-01-03',
          started_at: '2024-01-03',
          completed_at: '2024-01-03',
          expires_at: null,
          challenger: {
            id: 'user-123',
            display_name: 'Test Student',
            avatar_url: null,
          },
          opponent: {
            id: 'opponent-3',
            display_name: 'Opponent Three',
            avatar_url: null,
          },
          isWin: false,
        },
        {
          id: 'duel-4',
          challenger_id: 'user-123',
          opponent_id: 'opponent-4',
          classroom_id: 'class-1',
          lesson_id: 'lesson-1',
          duel_type: 'async',
          status: 'completed',
          board_state: null,
          challenger_score: 150,
          opponent_score: 100,
          winner_id: 'user-123',
          xp_awarded: true,
          created_at: '2024-01-04',
          started_at: '2024-01-04',
          completed_at: '2024-01-04',
          expires_at: null,
          challenger: {
            id: 'user-123',
            display_name: 'Test Student',
            avatar_url: null,
          },
          opponent: {
            id: 'opponent-4',
            display_name: 'Opponent Four',
            avatar_url: null,
          },
          isWin: true,
        },
        {
          id: 'duel-5',
          challenger_id: 'user-123',
          opponent_id: 'opponent-5',
          classroom_id: 'class-1',
          lesson_id: 'lesson-1',
          duel_type: 'async',
          status: 'completed',
          board_state: null,
          challenger_score: 110,
          opponent_score: 105,
          winner_id: 'user-123',
          xp_awarded: true,
          created_at: '2024-01-05',
          started_at: '2024-01-05',
          completed_at: '2024-01-05',
          expires_at: null,
          challenger: {
            id: 'user-123',
            display_name: 'Test Student',
            avatar_url: null,
          },
          opponent: {
            id: 'opponent-5',
            display_name: 'Opponent Five',
            avatar_url: null,
          },
          isWin: true,
        },
      ],
      error: null,
    });

    render(<StudentProfilePageClient />);

    // Wait for recent duels to load
    await waitFor(() => {
      expect(screen.getByText('student.profile.recentDuels')).toBeInTheDocument();
    });

    // Check opponent names are displayed
    expect(screen.getByText(/Opponent One/)).toBeInTheDocument();
    expect(screen.getByText(/Opponent Two/)).toBeInTheDocument();
    expect(screen.getByText(/Opponent Three/)).toBeInTheDocument();
    expect(screen.getByText(/Opponent Four/)).toBeInTheDocument();
    expect(screen.getByText(/Opponent Five/)).toBeInTheDocument();
  });

  test('shows empty state for duels when no duel history', async () => {
    // Mock empty duel stats
    mockGetDuelStats.mockResolvedValue({
      data: {
        wins: 0,
        losses: 0,
        draws: 0,
        winStreak: 0,
        currentStreak: 0,
        opponentStats: new Map(),
      },
      error: null,
    });

    mockGetDuelHistory.mockResolvedValue({
      data: [],
      error: null,
    });

    render(<StudentProfilePageClient />);

    // Wait for empty-state (requires both the section header AND the async duel
    // fetch to complete so the empty-state condition fires)
    await waitFor(() => {
      expect(screen.getByText('student.profile.noDuelsYet')).toBeInTheDocument();
      expect(screen.getByText('student.profile.challengePrompt')).toBeInTheDocument();
    });
  });

  test('shows link to full duel history when duels exist', async () => {
    mockGetDuelStats.mockResolvedValue({
      data: {
        wins: 5,
        losses: 2,
        draws: 1,
        winStreak: 3,
        currentStreak: 2,
        opponentStats: new Map(),
      },
      error: null,
    });

    mockGetDuelHistory.mockResolvedValue({
      data: [
        {
          id: 'duel-1',
          challenger_id: 'user-123',
          opponent_id: 'opponent-1',
          classroom_id: 'class-1',
          lesson_id: 'lesson-1',
          duel_type: 'async',
          status: 'completed',
          board_state: null,
          challenger_score: 100,
          opponent_score: 80,
          winner_id: 'user-123',
          xp_awarded: true,
          created_at: '2024-01-01',
          started_at: '2024-01-01',
          completed_at: '2024-01-01',
          expires_at: null,
          challenger: {
            id: 'user-123',
            display_name: 'Test Student',
            avatar_url: null,
          },
          opponent: {
            id: 'opponent-1',
            display_name: 'Opponent One',
            avatar_url: null,
          },
          isWin: true,
        },
      ],
      error: null,
    });

    render(<StudentProfilePageClient />);

    // Wait for link to appear
    await waitFor(() => {
      const link = screen.getByText(/student\.profile\.viewDuelHistory/);
      expect(link).toBeInTheDocument();
      expect(link.closest('a')).toHaveAttribute('href', '/en/duels/history');
    });
  });

  test('shows link to full achievements page', async () => {
    mockGetDuelStats.mockResolvedValue({
      data: {
        wins: 0,
        losses: 0,
        draws: 0,
        winStreak: 0,
        currentStreak: 0,
        opponentStats: new Map(),
      },
      error: null,
    });

    mockGetDuelHistory.mockResolvedValue({
      data: [],
      error: null,
    });

    render(<StudentProfilePageClient />);

    // Wait for page to render
    await waitFor(() => {
      expect(screen.getByText('student.dashboard.achievements')).toBeInTheDocument();
    });

    // Check "View All" link exists and points to achievements page
    const viewAllLink = screen.getByText('student.dashboard.viewAll →');
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink.closest('a')).toHaveAttribute('href', '/en/student/achievements');
  });
});
