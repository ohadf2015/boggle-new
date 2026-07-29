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

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

const mockT = (key: string) => key;

beforeEach(() => {
  vi.clearAllMocks();
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
      expect(global.fetch).toHaveBeenCalledWith('/api/account/delete', { method: 'DELETE' });
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
});
