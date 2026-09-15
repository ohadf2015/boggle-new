/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnpluggedReteachGradePassback } from '../UnpluggedReteachGradePassback';
import { shareWithFallback } from '@/utils/shareWithFallback';
import type { ClassGapSharePayload } from '@/lib/education/classGapShare';
import { scoreUnpluggedReteach } from '@/lib/education/unpluggedReteachGradePassback';

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

const payload: ClassGapSharePayload = {
  locale: 'en',
  lesson: 'Physics 101',
  teacher: 'Ms. Cohen',
  found: 2,
  total: 3,
  missedWords: ['neutron', 'quark'],
};

describe('UnpluggedReteachGradePassback', () => {
  beforeEach(() => {
    vi.mocked(shareWithFallback).mockClear();
    vi.mocked(shareWithFallback).mockResolvedValue('copied');
  });

  it('shows the score receipt and WhatsApp parent card', () => {
    const score = scoreUnpluggedReteach({
      cleared: 2,
      total: 2,
      dueDate: '2026-09-15',
      completedOn: '2026-09-14',
    });
    render(
      <UnpluggedReteachGradePassback
        payload={payload}
        score={score}
        dueDate="2026-09-15"
      />,
    );
    expect(screen.getByTestId('unplugged-grade-passback')).toBeInTheDocument();
    const card = screen.getByTestId('unplugged-grade-score');
    expect(card).toHaveAttribute('data-points', '100');
    expect(card).toHaveAttribute('data-max', '100');
    expect(card).toHaveAttribute('data-on-time', '1');
    expect(card).toHaveAttribute('data-cleared', '2');
    expect(screen.getByTestId('unplugged-grade-privacy')).toBeInTheDocument();
    expect(screen.getByTestId('miss-gap-whatsapp-share-card')).toBeInTheDocument();
  });

  it('copies grade receipt URL with points on lexiclash.live', async () => {
    const score = scoreUnpluggedReteach({
      cleared: 2,
      total: 2,
      dueDate: '2026-09-15',
      completedOn: '2026-09-15',
    });
    render(
      <UnpluggedReteachGradePassback
        payload={payload}
        score={score}
        dueDate="2026-09-15"
      />,
    );
    fireEvent.click(screen.getByTestId('unplugged-grade-copy-receipt'));
    await waitFor(() => expect(shareWithFallback).toHaveBeenCalled());
    const arg = vi.mocked(shareWithFallback).mock.calls[0][0] as { url?: string };
    expect(arg.url).toContain('/education/unplugged-grade-passback');
    expect(arg.url).toContain('points=100');
    expect(arg.url).toContain('lexiclash.live');
    expect(arg.url).not.toContain('lexiclash.com');
  });
});
