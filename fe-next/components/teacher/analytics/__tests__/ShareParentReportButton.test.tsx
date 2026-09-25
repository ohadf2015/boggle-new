// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

/**
 * "Share with parent" — a Teacher Pro action that mints a signed report
 * link for one student and copies it to the clipboard. Lives inside
 * StudentProgressTable, which is already rendered behind <ProGate>.
 */

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: { success: (...args: unknown[]) => toastSuccess(...args), error: (...args: unknown[]) => toastError(...args) },
}));

import { ShareParentReportButton } from '../ShareParentReportButton';

const CLASSROOM = 'classroom-1';
const STUDENT = 'student-1';

describe('ShareParentReportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global as any).fetch = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it('posts to the parent-report endpoint for THIS classroom and student, never a different pair', async () => {
    (global.fetch as any).mockResolvedValue(new Response(JSON.stringify({ ok: true, path: '/report/tok.sig' }), { status: 200 }));

    render(<ShareParentReportButton classroomId={CLASSROOM} studentId={STUDENT} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toBe(`/api/education/classroom/${CLASSROOM}/members/${STUDENT}/parent-report`);
    expect(init).toEqual(expect.objectContaining({ method: 'POST' }));
  });

  it('copies the locale-prefixed absolute URL to the clipboard and shows the shared success toast', async () => {
    (global.fetch as any).mockResolvedValue(new Response(JSON.stringify({ ok: true, path: '/report/tok.sig' }), { status: 200 }));

    render(<ShareParentReportButton classroomId={CLASSROOM} studentId={STUDENT} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/en/report/tok.sig`),
    );
    expect(toastSuccess).toHaveBeenCalledWith('share.linkCopied');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('shows a failure toast (never throws) when the API responds not-ok, e.g. 402 not Pro', async () => {
    (global.fetch as any).mockResolvedValue(new Response(JSON.stringify({ ok: false, error: 'Teacher Pro required' }), { status: 402 }));

    render(<ShareParentReportButton classroomId={CLASSROOM} studentId={STUDENT} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('education.analytics.shareParentReportFailed'));
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('shows a failure toast when the network request itself rejects', async () => {
    (global.fetch as any).mockRejectedValue(new Error('network down'));

    render(<ShareParentReportButton classroomId={CLASSROOM} studentId={STUDENT} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('education.analytics.shareParentReportFailed'));
  });

  it('shows a failure toast when the clipboard write itself rejects', async () => {
    (global.fetch as any).mockResolvedValue(new Response(JSON.stringify({ ok: true, path: '/report/tok.sig' }), { status: 200 }));
    (navigator.clipboard.writeText as any).mockRejectedValue(new Error('denied'));

    render(<ShareParentReportButton classroomId={CLASSROOM} studentId={STUDENT} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('education.analytics.shareParentReportFailed'));
  });

  it('does not bubble the click to a parent row handler (row click would navigate away)', async () => {
    (global.fetch as any).mockResolvedValue(new Response(JSON.stringify({ ok: true, path: '/report/tok.sig' }), { status: 200 }));
    const rowClick = vi.fn();

    render(
      <div onClick={rowClick} role="presentation">
        <ShareParentReportButton classroomId={CLASSROOM} studentId={STUDENT} />
      </div>,
    );
    fireEvent.click(screen.getByRole('button'));

    expect(rowClick).not.toHaveBeenCalled();
  });

  it('disables the button while the request is in flight to prevent double-submits', async () => {
    let resolveFetch: (value: Response) => void = () => {};
    (global.fetch as any).mockReturnValue(new Promise((resolve) => { resolveFetch = resolve; }));

    render(<ShareParentReportButton classroomId={CLASSROOM} studentId={STUDENT} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(button).toBeDisabled();
    resolveFetch(new Response(JSON.stringify({ ok: true, path: '/report/tok.sig' }), { status: 200 }));
    await waitFor(() => expect(button).not.toBeDisabled());
  });
});
