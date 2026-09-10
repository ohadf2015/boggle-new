import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

const { mockUseAuth, mockPush, mockLive } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockPush: vi.fn(),
  mockLive: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, a?: unknown) => {
      const params = a && typeof a === 'object' ? a : undefined;
      return params ? `${k}|${JSON.stringify(params)}` : k;
    },
    language: 'en',
  }),
}));
vi.mock('@/hooks/useStudentClassroom', () => ({
  useStudentClassroom: () => ({ classroomId: 'c1', classroom: { id: 'c1', name: 'ELA (7th)' } }),
}));
vi.mock('@/hooks/useActiveClassroomGame', () => ({
  useActiveClassroomGame: mockLive,
}));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div data-testid="loader" /> }));
vi.mock('@/components/student/StudentHubPlayZone', () => ({
  StudentHubPlayZone: () => <div data-testid="play-zone" />,
}));
vi.mock('@/components/student/ClassroomGameBanner', () => ({
  ClassroomGameBanner: () => <div data-testid="live-banner" />,
}));
vi.mock('@/components/student/StudentHubProgressZone', () => ({
  StudentHubProgressZone: () => <div data-testid="progress-zone" />,
}));
vi.mock('@/components/student/StudentHubLearnZone', () => ({
  StudentHubLearnZone: () => <div data-testid="learn-zone" />,
}));
vi.mock('@/lib/education/studentDisplayName', () => ({ resolveStudentDisplayName: () => 'Maya' }));
vi.mock('@/lib/supabase', () => ({ signOut: vi.fn() }));
vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => ({ children, ...p }: { children?: React.ReactNode; [k: string]: unknown }) =>
      React.createElement('div', p, children as React.ReactNode),
  }),
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

import StudentPageClient from '../PageClient';

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: { id: 's1' },
    profile: { id: 's1', user_role: null },
    loading: false,
  });
});

describe('StudentPageClient — live class game is the whole screen', () => {
  it('hides learn, play, and XP chrome while a class game is running', async () => {
    mockLive.mockReturnValue({
      activeGame: { gameCode: 'ABC123', teacherName: 'Ms. K', lessonNames: ['Week 3'] },
      isConnected: true,
      socket: {},
    });
    render(<StudentPageClient />);
    await waitFor(() => expect(screen.getByTestId('live-banner')).toBeInTheDocument());
    expect(screen.queryByTestId('learn-zone')).not.toBeInTheDocument();
    expect(screen.queryByTestId('play-zone')).not.toBeInTheDocument();
    expect(screen.queryByTestId('progress-zone')).not.toBeInTheDocument();
  });

  it('restores the hub when no live game is running', async () => {
    mockLive.mockReturnValue({ activeGame: null, isConnected: true, socket: {} });
    render(<StudentPageClient />);
    await waitFor(() => expect(screen.getByTestId('learn-zone')).toBeInTheDocument());
    expect(screen.getByTestId('play-zone')).toBeInTheDocument();
    expect(screen.getByTestId('progress-zone')).toBeInTheDocument();
  });
});
