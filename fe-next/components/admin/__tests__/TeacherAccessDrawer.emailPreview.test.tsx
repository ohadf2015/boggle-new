/**
 * TeacherAccessDrawer email preview + copy tests
 * Covers: readable personal-message textarea, live email preview, copy-to-clipboard
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';
import { TeacherAccessDrawer } from '../TeacherAccessDrawer';
import type { TeacherAccessRequest } from '@/lib/education/types';

vi.mock('react-hot-toast');
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, defaults?: any) => (typeof defaults === 'string' ? defaults : key),
  }),
}));

const mockRequest: TeacherAccessRequest = {
  id: '123',
  full_name: 'Jane Smith',
  email: 'jane@example.com',
  role: 'teacher',
  locale: 'en',
  country: 'USA',
  school_or_org: 'Lincoln High School',
  use_case: 'We want to use this for our ESL program.',
  status: 'pending',
  admin_note: null,
  created_at: '2026-05-14T10:00:00Z',
  updated_at: '2026-05-14T10:00:00Z',
};

describe('TeacherAccessDrawer email preview & copy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders the personal-message textarea with readable (dark) text, not white-on-white', () => {
    render(<TeacherAccessDrawer row={mockRequest} onClose={vi.fn()} onActioned={vi.fn()} />);
    const textarea = screen.getByLabelText('admin.teacherAccess.admin_note');
    expect(textarea.className).toContain('text-neo-navy');
    expect(textarea.className).toContain('bg-white');
  });

  it('shows a live email preview iframe containing the typed personal message', async () => {
    const user = userEvent.setup();
    render(<TeacherAccessDrawer row={mockRequest} onClose={vi.fn()} onActioned={vi.fn()} />);

    const toggle = screen.getByRole('button', { name: 'Preview email' });
    await user.click(toggle);

    const textarea = screen.getByLabelText('admin.teacherAccess.admin_note');
    await user.clear(textarea);
    await user.type(textarea, 'Welcome aboard');

    const iframe = (await screen.findByTitle('Email preview')) as HTMLIFrameElement;
    await waitFor(() => {
      expect(iframe.srcdoc).toContain('Welcome aboard');
    });
    // The applicant's name should appear in the rendered email.
    expect(iframe.srcdoc).toContain('Jane Smith');
  });

  it('copies the generated email HTML to the clipboard', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(<TeacherAccessDrawer row={mockRequest} onClose={vi.fn()} onActioned={vi.fn()} />);

    const textarea = screen.getByLabelText('admin.teacherAccess.admin_note');
    await user.type(textarea, 'See you in class');

    const copyBtn = screen.getByRole('button', { name: 'Copy email HTML' });
    await user.click(copyBtn);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain('See you in class');
    expect(copied).toContain('<!doctype html>');
    expect(toast.success).toHaveBeenCalled();
  });
});
