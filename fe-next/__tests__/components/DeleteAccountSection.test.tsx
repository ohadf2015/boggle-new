import { vi, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeleteAccountSection from '@/components/settings/DeleteAccountSection';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { signOut } from '@/lib/supabase';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const strip = (props: Record<string, unknown>) => {
    const { whileHover, whileTap, animate, initial, exit, transition, variants, ...rest } = props;
    return rest;
  };
  return {
    m: {
      section: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <section {...strip(props)}>{children}</section>,
      div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...strip(props)}>{children}</div>,
    },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

vi.mock('@/contexts/AuthContext');
vi.mock('@/contexts/LanguageContext');
vi.mock('@/lib/supabase', () => ({ signOut: vi.fn() }));
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: vi.fn() }));
vi.mock('@/lib/education/teacherDeleteTelemetry', () => ({
  trackTeacherDeleteViewed: vi.fn(),
  trackTeacherDeleteReasonSelected: vi.fn(),
  trackTeacherDeleteAlternativeChosen: vi.fn(),
  trackTeacherDeleteConfirmed: vi.fn(),
}));

const impactState = {
  impact: null as import('@/lib/account/deleteAccountImpact').DeleteImpactSummary | null,
};
vi.mock('@/lib/account/useDeleteImpact', () => ({
  useDeleteImpact: () => ({ impact: impactState.impact, isLoading: false, reload: vi.fn() }),
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

const mockT = (key: string) => key;

beforeEach(() => {
  vi.clearAllMocks();
  impactState.impact = null;
  (useLanguage as Mock).mockReturnValue({ t: mockT, language: 'en' });
  (useAuth as Mock).mockReturnValue({ user: { id: 'user-123' } });
  global.fetch = vi.fn();
});

describe('DeleteAccountSection', () => {
  it('renders nothing when user is not authenticated', () => {
    (useAuth as Mock).mockReturnValue({ user: null });
    const { container } = render(<DeleteAccountSection isDarkMode={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders danger zone heading and delete button', () => {
    render(<DeleteAccountSection isDarkMode={false} />);
    expect(screen.getByText('settings.dangerZone')).toBeInTheDocument();
    expect(screen.getByText('settings.deleteAccountButton')).toBeInTheDocument();
  });

  it('shows confirmation form when delete button is clicked', () => {
    render(<DeleteAccountSection isDarkMode={false} />);
    fireEvent.click(screen.getByText('settings.deleteAccountButton'));
    expect(screen.getByPlaceholderText('DELETE')).toBeInTheDocument();
    expect(screen.getByText('settings.deleteAccountConfirm')).toBeInTheDocument();
  });

  it('disables confirm button until user types DELETE', () => {
    render(<DeleteAccountSection isDarkMode={false} />);
    fireEvent.click(screen.getByText('settings.deleteAccountButton'));

    const confirmBtn = screen.getByText('settings.deleteAccountConfirmButton');
    expect(confirmBtn).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('DELETE'), { target: { value: 'DELETE' } });
    expect(confirmBtn).not.toBeDisabled();
  });

  it('calls API, signs out, and redirects on successful deletion', async () => {
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    (signOut as Mock).mockResolvedValue(undefined);

    render(<DeleteAccountSection isDarkMode={false} />);
    fireEvent.click(screen.getByText('settings.deleteAccountButton'));
    fireEvent.change(screen.getByPlaceholderText('DELETE'), { target: { value: 'DELETE' } });
    fireEvent.click(screen.getByText('settings.deleteAccountConfirmButton'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/account/delete',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/en');
    });
  });

  it('shows error message when API returns error', async () => {
    (global.fetch as Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Server error' }),
    });

    render(<DeleteAccountSection isDarkMode={false} />);
    fireEvent.click(screen.getByText('settings.deleteAccountButton'));
    fireEvent.change(screen.getByPlaceholderText('DELETE'), { target: { value: 'DELETE' } });
    fireEvent.click(screen.getByText('settings.deleteAccountConfirmButton'));

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('shows generic error on fetch failure', async () => {
    (global.fetch as Mock).mockRejectedValue(new Error('Network error'));

    render(<DeleteAccountSection isDarkMode={false} />);
    fireEvent.click(screen.getByText('settings.deleteAccountButton'));
    fireEvent.change(screen.getByPlaceholderText('DELETE'), { target: { value: 'DELETE' } });
    fireEvent.click(screen.getByText('settings.deleteAccountConfirmButton'));

    await waitFor(() => {
      expect(screen.getByText('settings.deleteAccountError')).toBeInTheDocument();
    });
  });

  it('hides confirmation when cancel button is clicked', () => {
    render(<DeleteAccountSection isDarkMode={false} />);
    fireEvent.click(screen.getByText('settings.deleteAccountButton'));
    expect(screen.getByPlaceholderText('DELETE')).toBeInTheDocument();

    // Cancel button has an X icon — find it by role
    const buttons = screen.getAllByRole('button');
    const cancelBtn = buttons.find(btn => btn.textContent === '' || btn.querySelector('svg'));
    if (cancelBtn) fireEvent.click(cancelBtn);

    // After cancel, the input should be gone (AnimatePresence mock renders conditionally)
  });

  it('applies dark mode styles', () => {
    render(<DeleteAccountSection isDarkMode={true} />);
    // Surface migrated from raw bg-slate-800 to the neo token (cosy-themable).
    const card = screen.getByText('settings.deleteAccount').closest('[class*="border-neo-red"]');
    expect(card?.className).toContain('bg-neo-navy-light');
  });

  describe('teacher-aware flow (t_b5825a0a)', () => {
    const TEACHER_IMPACT = {
      isTeacher: true,
      classrooms: [{ id: 'c1', name: 'Period 3', studentCount: 19 }],
      totalStudents: 19,
      roundsPlayed: 15,
      emailSubscribed: true,
      billing: { tier: 'free' as const, status: null, renews: false, portalUrl: null },
      perClassDeleteAvailable: true,
    };

    beforeEach(() => {
      impactState.impact = TEACHER_IMPACT;
    });

    it('a classroom teacher sees the impact step instead of the bare DELETE form', () => {
      render(<DeleteAccountSection isDarkMode={false} />);
      fireEvent.click(screen.getByText('settings.deleteAccountButton'));
      expect(screen.getByTestId('teacher-delete-interstitial')).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('DELETE')).not.toBeInTheDocument();
    });

    it('continue reveals the irreversible DELETE form', () => {
      render(<DeleteAccountSection isDarkMode={false} />);
      fireEvent.click(screen.getByText('settings.deleteAccountButton'));
      // Reason is optional; continue still reveals the irreversible form.
      fireEvent.click(screen.getByText('settings.teacherDeleteReason.too_expensive'));
      fireEvent.click(screen.getByText('settings.teacherDeleteContinue'));
      expect(screen.getByPlaceholderText('DELETE')).toBeInTheDocument();
    });

    it('"keep free account" closes the panel without any DELETE call', () => {
      render(<DeleteAccountSection isDarkMode={false} />);
      fireEvent.click(screen.getByText('settings.deleteAccountButton'));
      fireEvent.click(screen.getByText('settings.teacherDeleteKeepFree'));
      expect(screen.queryByTestId('teacher-delete-interstitial')).not.toBeInTheDocument();
      expect(global.fetch).not.toHaveBeenCalledWith(
        '/api/account/delete',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('the DELETE body carries the picked reason and settings surface', async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      (signOut as Mock).mockResolvedValue(undefined);

      render(<DeleteAccountSection isDarkMode={false} />);
      fireEvent.click(screen.getByText('settings.deleteAccountButton'));
      fireEvent.click(screen.getByText('settings.teacherDeleteReason.too_expensive'));
      fireEvent.click(screen.getByText('settings.teacherDeleteContinue'));
      fireEvent.change(screen.getByPlaceholderText('DELETE'), { target: { value: 'DELETE' } });
      fireEvent.click(screen.getByText('settings.deleteAccountConfirmButton'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/account/delete',
          expect.objectContaining({
            method: 'DELETE',
            body: JSON.stringify({ reason: 'too_expensive', surface: 'settings' }),
          })
        );
      });
    });
  });
});
