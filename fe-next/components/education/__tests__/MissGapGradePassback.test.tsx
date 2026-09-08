/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MissGapGradePassback } from '../MissGapGradePassback';
import { shareWithFallback } from '@/utils/shareWithFallback';
import type { MissGapAssignmentPayload } from '@/lib/education/missGapAsyncAssignment';
import { scoreMissGapHomework } from '@/lib/education/missGapGradePassback';

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

const payload: MissGapAssignmentPayload = {
  locale: 'en',
  lesson: 'Physics 101',
  teacher: 'Ms. Cohen',
  found: 2,
  total: 3,
  missedWords: ['neutron', 'quark'],
  dueDate: '2026-09-15',
};

describe('MissGapGradePassback', () => {
  beforeEach(() => {
    vi.mocked(shareWithFallback).mockClear();
    vi.mocked(shareWithFallback).mockResolvedValue('copied');
  });

  it('shows Kahoot grade-passback foil + score receipt', () => {
    const score = scoreMissGapHomework({
      dueDate: '2026-09-15',
      completedOn: '2026-09-14',
    });
    render(<MissGapGradePassback payload={payload} score={score} />);
    expect(screen.getByTestId('miss-gap-grade-passback')).toBeInTheDocument();
    expect(screen.getByTestId('miss-gap-grade-passback-foil')).toBeInTheDocument();
    const card = screen.getByTestId('miss-gap-grade-score');
    expect(card).toHaveAttribute('data-points', '100');
    expect(card).toHaveAttribute('data-max', '100');
    expect(card).toHaveAttribute('data-on-time', '1');
    expect(screen.getByTestId('miss-gap-grade-privacy')).toBeInTheDocument();
    expect(screen.getByTestId('miss-gap-whatsapp-share-card')).toBeInTheDocument();
    expect(screen.getByTestId('miss-gap-whatsapp-foil')).toBeInTheDocument();
  });

  it('copies grade receipt URL with points', async () => {
    const score = scoreMissGapHomework({
      dueDate: '2026-09-15',
      completedOn: '2026-09-15',
    });
    render(<MissGapGradePassback payload={payload} score={score} />);
    fireEvent.click(screen.getByTestId('miss-gap-grade-copy-receipt'));
    await waitFor(() => expect(shareWithFallback).toHaveBeenCalled());
    const arg = vi.mocked(shareWithFallback).mock.calls[0][0] as { url?: string };
    expect(arg.url).toContain('/education/miss-gap-grade-passback');
    expect(arg.url).toContain('points=100');
  });
});
