import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeleteAccountPageClient from '../PageClient';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/utils/ThemeContext';
import { useDeleteImpact } from '@/lib/account/useDeleteImpact';

vi.mock('@/contexts/LanguageContext');
vi.mock('@/contexts/AuthContext');
vi.mock('@/utils/ThemeContext');
vi.mock('@/lib/account/useDeleteImpact');
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));
vi.mock('@/components/Header', () => ({
  default: () => <div data-testid="header-mock" />,
}));
vi.mock('@/lib/supabase', () => ({
  signInWithMagicLink: vi.fn(),
  signOut: vi.fn(),
}));

const mockT = (k: string) => k;

describe('DeleteAccountPageClient teacher vs non-teacher flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLanguage).mockReturnValue({ t: mockT, language: 'en' } as any);
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'user-1' } } as any);
    vi.mocked(useTheme).mockReturnValue({ theme: 'light' } as any);
  });

  it('teacher sees roster warning + off-ramps via interstitial', () => {
    vi.mocked(useDeleteImpact).mockReturnValue({
      impact: {
        isTeacher: true,
        classrooms: [{ id: 'c1', name: 'Math Class', studentCount: 15 }],
        totalStudents: 15,
        roundsPlayed: 10,
        emailSubscribed: true,
        billing: { tier: 'free', status: null, renews: false, portalUrl: null },
        perClassDeleteAvailable: true,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DeleteAccountPageClient />);

    // Interstitial is shown with teacher impact and off-ramps
    expect(screen.getByTestId('teacher-delete-interstitial')).toBeInTheDocument();
    expect(screen.getByText('settings.teacherDeleteImpactTitle')).toBeInTheDocument();
    expect(screen.getByText('settings.teacherDeleteStopEmails')).toBeInTheDocument();
    expect(screen.getByText('settings.teacherDeleteKeepFree')).toBeInTheDocument();
    // Plain type-DELETE input should NOT be shown yet
    expect(screen.queryByPlaceholderText('DELETE')).not.toBeInTheDocument();
  });

  it('non-teacher sees the plain flow directly without roster warning or off-ramps', () => {
    vi.mocked(useDeleteImpact).mockReturnValue({
      impact: {
        isTeacher: false,
        classrooms: [],
        totalStudents: 0,
        roundsPlayed: 0,
        emailSubscribed: true,
        billing: { tier: null, status: null, renews: false, portalUrl: null },
        perClassDeleteAvailable: false,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DeleteAccountPageClient />);

    // Plain flow elements are present
    expect(screen.queryByTestId('teacher-delete-interstitial')).not.toBeInTheDocument();
    expect(screen.queryByText('settings.teacherDeleteImpactTitle')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('DELETE')).toBeInTheDocument();
    expect(screen.getByText('settings.deleteAccountConfirmButton')).toBeInTheDocument();
    expect(screen.getByTestId('delete-reason-picker')).toBeInTheDocument();
  });
});
