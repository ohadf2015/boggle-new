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

  test('offers no duel entry points and never loads duel data', async () => {
    render(<StudentProfilePageClient />);

    await waitFor(() => expect(screen.getByTestId('badge-grid')).toBeTruthy());
    expect(screen.queryByText('student.profile.duelRecord')).toBeNull();
    expect(screen.queryByText('duels.challengeClassmate')).toBeNull();
    expect(mockGetDuelStats).not.toHaveBeenCalled();
    expect(mockGetDuelHistory).not.toHaveBeenCalled();
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
