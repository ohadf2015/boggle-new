import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const pref = vi.hoisted(() => ({ reduced: false }));
vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({ useEduReducedMotion: () => pref.reduced }));

import { VocabQuizFooterBar } from '../VocabQuizFooterBar';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const lockedBand = () => render(<VocabQuizFooterBar locked picked="fragile" lockedIn={{ locked: 2, total: 4 }} t={t} />);

describe('Vocab quiz footer band: one idea, room count as a chip', () => {
  beforeEach(() => {
    pref.reduced = false;
  });

  it('given no answer yet, the speed tip is one line', () => {
    render(<VocabQuizFooterBar locked={false} streak={0} lockedIn={{ locked: 2, total: 4 }} t={t} />);
    const hint = screen.getByTestId('vocab-quiz-footer-hint');
    expect(hint).toHaveTextContent('vocabQuiz.footer.speedTip');
    expect(screen.getByTestId('vocab-quiz-footer-text').children).toHaveLength(1);
  });

  it('never truncates the hint or the locked-in lines', () => {
    const { container, unmount } = render(<VocabQuizFooterBar locked={false} streak={3} lockedIn={{ locked: 1, total: 4 }} t={t} />);
    expect(container.querySelector('.truncate')).toBeNull();
    unmount();
    expect(lockedBand().container.querySelector('.truncate')).toBeNull();
  });

  it('marks a live streak so the flame lights up, and a zero streak stays quiet', () => {
    const { rerender } = render(<VocabQuizFooterBar locked={false} streak={0} t={t} />);
    expect(screen.getByTestId('vocab-quiz-footer-hint').dataset.live).toBe('false');
    rerender(<VocabQuizFooterBar locked={false} streak={2} t={t} />);
    expect(screen.getByTestId('vocab-quiz-footer-hint').dataset.live).toBe('true');
  });

  it('drops the mascot repeat: the header already shows Lexi', () => {
    lockedBand();
    expect(screen.queryByTestId('vocab-quiz-footer-mascot')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('keeps text then room chip on one row, the dots anchored at the end beside the hint', () => {
    lockedBand();
    const row = screen.getByTestId('vocab-quiz-footer-row');
    const kids = Array.from(row.children).map((n) => n.getAttribute('data-testid'));
    expect(kids).toEqual(['vocab-quiz-footer-text', 'vocab-quiz-footer-room']);
    expect(row.className).not.toMatch(/(^|\s)flex-wrap(\s|$)/);
  });

  it('draws the room count end-aligned as big dots and a readable count, not cyan', () => {
    lockedBand();
    const room = screen.getByTestId('vocab-quiz-footer-room');
    expect(room).toHaveTextContent('vocabQuiz.footer.roomCount:2,4');
    expect(room.className).toContain('ms-auto');
    expect(room.className).toContain('text-neo-white');
    expect(room.className).not.toContain('text-neo-cyan');
    expect(room.className).not.toMatch(/max-w-\[/);
  });

  it('given a locked answer, the check sits inside the headline with the picked word as a muted subline', () => {
    lockedBand();
    const headline = screen.getByTestId('vocab-quiz-footer-status');
    const picked = screen.getByTestId('vocab-quiz-footer-picked');
    expect(headline).toHaveTextContent('vocabQuiz.footer.locked');
    expect(headline.querySelector('svg')).not.toBeNull();
    expect(headline.className).not.toMatch(/\bbg-neo-/);
    expect(headline.compareDocumentPosition(picked) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(picked.className).toMatch(/text-neo-white\/\d+/);
  });

  it('holds the row on the question column with 16px gutters, pinned to the bottom above the safe area', () => {
    lockedBand();
    const row = screen.getByTestId('vocab-quiz-footer-row');
    const gutters = screen.getByTestId('vocab-quiz-footer-gutters');
    expect(row.parentElement).toBe(gutters);
    expect(row.className).toContain('max-w-[720px]');
    expect(gutters.className).toContain('px-4');
    expect(gutters.className).toContain('pb-[max(0.75rem,env(safe-area-inset-bottom))]');
    expect(screen.getByTestId('vocab-quiz-footer').className).not.toMatch(/(^|\s)h-\[calc/);
  });

  it('keeps a phone row clear of the bottom-left corner in both directions', () => {
    lockedBand();
    expect(screen.getByTestId('vocab-quiz-footer-row').className).toContain('max-sm:pl-12');
  });
});
