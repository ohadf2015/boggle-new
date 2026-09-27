import { vi, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeleteAccountPageClient from '@/app/[locale]/account/delete/PageClient';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { signInWithMagicLink, signOut } from '@/lib/supabase';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const strip = (props: Record<string, unknown>) => {
    const { whileHover, whileTap, animate, initial, exit, transition, variants, ...rest } = props;
    return rest;
  };
  return {
    m: {
      div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...strip(props)}>{children}</div>,
    },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

vi.mock('@/contexts/AuthContext');
vi.mock('@/contexts/LanguageContext');
vi.mock('@/utils/ThemeContext');
vi.mock('@/lib/supabase', () => ({
  signInWithMagicLink: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ locale: 'en' }),
}));
vi.mock('@/components/Header', () => ({
  default: function MockHeader() { return <div data-testid="header" />; },
}));

const mockT = (key: string) => key;

beforeEach(() => {
  vi.clearAllMocks();
  (useLanguage as Mock).mockReturnValue({ t: mockT, language: 'en' });
  (useTheme as Mock).mockReturnValue({ theme: 'dark' });
  global.fetch = vi.fn();
});

describe('DeleteAccountPageClient', () => {
  describe('when user is NOT authenticated', () => {
    beforeEach(() => {
      (useAuth as Mock).mockReturnValue({ user: null });
    });

    it('shows email input step', () => {
      render(<DeleteAccountPageClient />);
      expect(screen.getByPlaceholderText('deleteAccountWeb.emailPlaceholder')).toBeInTheDocument();
      expect(screen.getByText('deleteAccountWeb.sendLink')).toBeInTheDocument();
    });

    it('sends magic link on submit', async () => {
      (signInWithMagicLink as Mock).mockResolvedValue({ data: {}, error: null });

      render(<DeleteAccountPageClient />);
      fireEvent.change(screen.getByPlaceholderText('deleteAccountWeb.emailPlaceholder'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.click(screen.getByText('deleteAccountWeb.sendLink'));

      await waitFor(() => {
        expect(signInWithMagicLink).toHaveBeenCalledWith('test@example.com');
      });
      expect(screen.getByText('deleteAccountWeb.checkEmail')).toBeInTheDocument();
    });

    it('shows error when magic link fails', async () => {
      (signInWithMagicLink as Mock).mockResolvedValue({
        error: { message: 'Rate limited' },
      });

      render(<DeleteAccountPageClient />);
      fireEvent.change(screen.getByPlaceholderText('deleteAccountWeb.emailPlaceholder'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.click(screen.getByText('deleteAccountWeb.sendLink'));

      await waitFor(() => {
        expect(screen.getByText('Rate limited')).toBeInTheDocument();
      });
    });

    it('disables send button when email is empty', () => {
      render(<DeleteAccountPageClient />);
      expect(screen.getByText('deleteAccountWeb.sendLink')).toBeDisabled();
    });
  });

  describe('when user IS authenticated', () => {
    beforeEach(() => {
      (useAuth as Mock).mockReturnValue({ user: { id: 'user-123' } });
    });

    it('skips to confirm step directly', () => {
      render(<DeleteAccountPageClient />);
      expect(screen.getByPlaceholderText('DELETE')).toBeInTheDocument();
      expect(screen.getByText('settings.deleteAccountConfirm')).toBeInTheDocument();
    });

    it('deletes account and shows success', async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      (signOut as Mock).mockResolvedValue(undefined);

      render(<DeleteAccountPageClient />);
      fireEvent.change(screen.getByPlaceholderText('DELETE'), { target: { value: 'DELETE' } });
      fireEvent.click(screen.getByText('settings.deleteAccountConfirmButton'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/account/delete', { method: 'DELETE' });
      });
      await waitFor(() => {
        expect(screen.getByText('deleteAccountWeb.deleted')).toBeInTheDocument();
      });
    });

    it('shows error on API failure', async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      render(<DeleteAccountPageClient />);
      fireEvent.change(screen.getByPlaceholderText('DELETE'), { target: { value: 'DELETE' } });
      fireEvent.click(screen.getByText('settings.deleteAccountConfirmButton'));

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });
  });
});
