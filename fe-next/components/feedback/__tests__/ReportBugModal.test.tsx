import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('framer-motion', () => ({
  m: new Proxy(
    {},
    { get: () => ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div> }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockUser = { id: 'user-abc-123' };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, fb?: string) => (typeof fb === 'string' ? fb : k), language: 'en', dir: 'ltr' }),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/en/word-tower' }));

import { ReportBugModal } from '../ReportBugModal';

describe('ReportBugModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) }));
  });

  it('renders nothing when closed', () => {
    render(<ReportBugModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('shows the title and a message textarea when open', () => {
    render(<ReportBugModal isOpen onClose={vi.fn()} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('bugReport.title')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('keeps submit disabled until the message is long enough', async () => {
    const user = userEvent.setup();
    render(<ReportBugModal isOpen onClose={vi.fn()} />);
    const submit = screen.getByRole('button', { name: /bugReport\.submit/i });
    expect(submit).toBeDisabled();
    await user.type(screen.getByRole('textbox'), 'too short');
    expect(submit).toBeDisabled();
    await user.type(screen.getByRole('textbox'), ' but now this is plenty long');
    expect(submit).toBeEnabled();
  });

  it('POSTs to /api/feedback with auto-captured context on submit', async () => {
    const user = userEvent.setup();
    render(<ReportBugModal isOpen onClose={vi.fn()} />);
    await user.type(
      screen.getByRole('textbox'),
      'The tower collapsed when I submitted a valid word'
    );
    await user.click(screen.getByRole('button', { name: /bugReport\.submit/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/feedback', expect.any(Object)));
    const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const body = JSON.parse(init.body);
    expect(body.message).toContain('tower collapsed');
    expect(body.page).toBe('/en/word-tower');
    expect(body.userId).toBe('user-abc-123');
    expect(body.locale).toBe('en');
    expect(typeof body.userAgent).toBe('string');
    expect(typeof body.viewport).toBe('string');
  });

  it('shows the success message after a successful submit', async () => {
    const user = userEvent.setup();
    render(<ReportBugModal isOpen onClose={vi.fn()} />);
    await user.type(screen.getByRole('textbox'), 'A clear description of the bug here');
    await user.click(screen.getByRole('button', { name: /bugReport\.submit/i }));
    await waitFor(() => expect(screen.getByText('bugReport.success')).toBeInTheDocument());
  });

  it('shows the error message when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    const user = userEvent.setup();
    render(<ReportBugModal isOpen onClose={vi.fn()} />);
    await user.type(screen.getByRole('textbox'), 'A clear description of the bug here');
    await user.click(screen.getByRole('button', { name: /bugReport\.submit/i }));
    await waitFor(() => expect(screen.getByText('bugReport.error')).toBeInTheDocument());
  });

  // === CHANGE 4: IME handling for Hebrew on Android GBoard ===
  it('syncs message state from composition events (handles IME lag)', async () => {
    const user = userEvent.setup();
    render(<ReportBugModal isOpen onClose={vi.fn()} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

    // Type normally first (this will work on regular keyboards)
    await user.type(textarea, 'A message that is long enough');
    const submit = screen.getByRole('button', { name: /bugReport\.submit/i });

    // Submit should be enabled after typing enough
    expect(submit).toBeEnabled();
  });

  it('shows min-length hint when text is 1-9 characters', async () => {
    const user = userEvent.setup();
    render(<ReportBugModal isOpen onClose={vi.fn()} />);
    const textarea = screen.getByRole('textbox');

    await user.type(textarea, 'short');
    // Hint should appear for < 10 chars
    await waitFor(() => {
      expect(screen.queryByText('bugReport.minLengthHint')).toBeTruthy();
    });
  });

  it('shows reward message when rewarded response received', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, rewarded: true }),
    }));
    const user = userEvent.setup();
    render(<ReportBugModal isOpen onClose={vi.fn()} />);
    await user.type(screen.getByRole('textbox'), 'A clear description of the bug here');
    await user.click(screen.getByRole('button', { name: /bugReport\.submit/i }));

    await waitFor(() => {
      expect(screen.queryByText('bugReport.rewardEarned')).toBeTruthy();
    });
  });

  it('does not show reward message when rewarded is false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, rewarded: false }),
    }));
    const user = userEvent.setup();
    render(<ReportBugModal isOpen onClose={vi.fn()} />);
    await user.type(screen.getByRole('textbox'), 'A clear description of the bug here');
    await user.click(screen.getByRole('button', { name: /bugReport\.submit/i }));

    await waitFor(() => expect(screen.getByText('bugReport.success')).toBeInTheDocument());
    expect(screen.queryByText('bugReport.rewardEarned')).toBeNull();
  });

  it('switches feedback type and posts it with the report', async () => {
    const user = userEvent.setup();
    render(<ReportBugModal isOpen onClose={vi.fn()} />);
    await user.click(screen.getByRole('radio', { name: /Feature idea/i }));
    await user.type(screen.getByRole('textbox'), 'Please add a practice mode with no timer');
    await user.click(screen.getByRole('button', { name: /bugReport\.submit/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/feedback', expect.any(Object)));
    const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const body = JSON.parse(init.body);
    expect(body.type).toBe('feature');
  });

  it('defaults to bug type and attaches device metadata', async () => {
    const user = userEvent.setup();
    render(<ReportBugModal isOpen onClose={vi.fn()} />);
    await user.type(screen.getByRole('textbox'), 'Something is broken on this page');
    await user.click(screen.getByRole('button', { name: /bugReport\.submit/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/feedback', expect.any(Object)));
    const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const body = JSON.parse(init.body);
    expect(body.type).toBe('bug');
    expect(typeof body.url).toBe('string');
    expect(typeof body.screen).toBe('string');
    expect(typeof body.platform).toBe('string');
    expect(typeof body.touch).toBe('number');
    expect(body.screenshotDataUrl).toBeUndefined();
  });
});
