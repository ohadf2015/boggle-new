import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KeyboardHintTooltip } from '../KeyboardHintTooltip';
import { noteTypedSubmit, TYPED_WORD_ACCEPTED_KEY } from '@/lib/input/typedWordHint';

const t = (k: string) => k;

function stubPointer({ fine, coarse }: { fine: boolean; coarse: boolean }) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q.includes('coarse') ? coarse : q.includes('fine') ? fine : false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe('KeyboardHintTooltip (desktop "just type" hint)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-25T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows from the first second on a mouse-and-keyboard desktop', () => {
    stubPointer({ fine: true, coarse: false });
    render(<KeyboardHintTooltip acceptedCount={0} t={t} />);
    expect(screen.getByTestId('type-word-hint').textContent).toContain('keyboardHint.typeAndEnter');
  });

  it('stays hidden on touch screens, including touch laptops with a mouse', () => {
    stubPointer({ fine: false, coarse: true });
    const { unmount } = render(<KeyboardHintTooltip acceptedCount={0} t={t} />);
    expect(screen.queryByTestId('type-word-hint')).toBeNull();
    unmount();
    stubPointer({ fine: true, coarse: true });
    render(<KeyboardHintTooltip acceptedCount={0} t={t} />);
    expect(screen.queryByTestId('type-word-hint')).toBeNull();
  });

  it('stays up while words land by mouse, and goes for good once a typed word is accepted', () => {
    stubPointer({ fine: true, coarse: false });
    const { rerender, unmount } = render(<KeyboardHintTooltip acceptedCount={0} t={t} />);
    rerender(<KeyboardHintTooltip acceptedCount={1} t={t} />);
    expect(screen.getByTestId('type-word-hint')).toBeInTheDocument();

    noteTypedSubmit();
    rerender(<KeyboardHintTooltip acceptedCount={2} t={t} />);
    expect(screen.queryByTestId('type-word-hint')).toBeNull();
    expect(localStorage.getItem(TYPED_WORD_ACCEPTED_KEY)).toBe('1');

    unmount();
    render(<KeyboardHintTooltip acceptedCount={0} t={t} />);
    expect(screen.queryByTestId('type-word-hint')).toBeNull();
  });

  it('does not credit a typed word that was rejected and followed later by a mouse word', () => {
    stubPointer({ fine: true, coarse: false });
    const { rerender } = render(<KeyboardHintTooltip acceptedCount={0} t={t} />);
    noteTypedSubmit();
    vi.setSystemTime(new Date('2026-11-25T10:00:30Z'));
    rerender(<KeyboardHintTooltip acceptedCount={1} t={t} />);
    expect(screen.getByTestId('type-word-hint')).toBeInTheDocument();
  });
});
