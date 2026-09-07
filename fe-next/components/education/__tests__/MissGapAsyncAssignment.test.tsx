/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MissGapAsyncAssignment } from '../MissGapAsyncAssignment';
import { shareWithFallback } from '@/utils/shareWithFallback';
import type { MissGapAssignmentPayload } from '@/lib/education/missGapAsyncAssignment';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

vi.mock('@/utils/shareWithFallback', () => ({
  shareWithFallback: vi.fn().mockResolvedValue('copied'),
}));

vi.mock('@/lib/education/missedWordsPracticeSheet', () => ({
  openMissedWordsPracticeSheet: vi.fn().mockReturnValue(true),
}));

const payload: MissGapAssignmentPayload = {
  locale: 'en',
  lesson: 'Physics 101',
  teacher: 'Ms. Cohen',
  found: 2,
  total: 3,
  missedWords: ['neutron', 'quark'],
  dueDate: '',
};

describe('MissGapAsyncAssignment', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(shareWithFallback).mockClear();
    vi.mocked(shareWithFallback).mockResolvedValue('copied');
  });

  it('teacher mode: due date + Kahootopia foil + GC assign (not Unplugged Live)', () => {
    render(<MissGapAsyncAssignment payload={payload} teacherMode />);
    expect(screen.getByTestId('miss-gap-async-assignment')).toBeInTheDocument();
    expect(screen.getByTestId('miss-gap-async-foil')).toBeInTheDocument();
    expect(screen.getByTestId('miss-gap-async-due-date')).toBeInTheDocument();
    const gc = screen.getByTestId('assign-miss-gap-async-google-classroom');
    expect(gc.getAttribute('href')).toContain('classroom.google.com/share');
    expect(gc.getAttribute('href')).toContain('itemtype=assignment');
    expect(decodeURIComponent(gc.getAttribute('href') || '')).toContain(
      'miss-gap-assignment',
    );
    expect(decodeURIComponent(gc.getAttribute('href') || '')).not.toContain(
      'unplugged-reteach',
    );
    expect(screen.getByTestId('miss-gap-practice-card')).toBeInTheDocument();
  });

  it('student mode: due banner + complete feeds class streak', async () => {
    render(
      <MissGapAsyncAssignment
        payload={{ ...payload, dueDate: '2099-12-31' }}
        teacherMode={false}
      />,
    );
    expect(screen.getByTestId('miss-gap-async-due-banner')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('miss-gap-async-complete'));
    await waitFor(() => {
      expect(screen.getByTestId('miss-gap-class-streak').textContent).toContain(
        '"streak":1',
      );
    });
  });

  it('shares async homework URL with due date', async () => {
    render(
      <MissGapAsyncAssignment
        payload={{ ...payload, dueDate: '2026-09-11' }}
        teacherMode
      />,
    );
    fireEvent.click(screen.getByTestId('share-miss-gap-async-homework'));
    await waitFor(() => expect(shareWithFallback).toHaveBeenCalled());
    const arg = vi.mocked(shareWithFallback).mock.calls[0][0] as { url?: string };
    expect(arg.url).toContain('/education/miss-gap-assignment');
    expect(arg.url).toContain('due=2026-09-11');
    expect(arg.url).toContain('neutron');
  });
});
