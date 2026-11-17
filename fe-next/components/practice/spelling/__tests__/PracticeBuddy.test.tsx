import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

let skip = true;
vi.mock('@/components/motion/AdaptiveMotion', () => ({ useSkipAnimations: () => skip }));

import { PracticeBuddy, BUDDY_CLIPS, BUDDY_IDLE } from '../PracticeBuddy';

describe('PracticeBuddy', () => {
  it('rests on the idle pose and is hidden from assistive tech', () => {
    render(<PracticeBuddy reaction={null} typing={false} typingTick={0} />);
    const buddy = screen.getByTestId('practice-buddy');
    expect(buddy).toHaveAttribute('aria-hidden', 'true');
    expect(buddy).toHaveAttribute('data-mood', 'idle');
    expect(screen.getByTestId('practice-buddy-art')).toHaveAttribute('src', BUDDY_IDLE);
  });

  it('with motion off, answers with a still pose and then settles back', () => {
    vi.useFakeTimers();
    skip = true;
    const { rerender } = render(<PracticeBuddy reaction={null} typing={false} typingTick={0} />);
    rerender(<PracticeBuddy reaction={{ kind: 'miss', id: 1 }} typing={false} typingTick={0} />);
    expect(screen.getByTestId('practice-buddy')).toHaveAttribute('data-mood', 'miss');
    expect(screen.getByTestId('practice-buddy-art')).toHaveAttribute('src', BUDDY_CLIPS.miss.still);
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByTestId('practice-buddy')).toHaveAttribute('data-mood', 'idle');
    vi.useRealTimers();
  });

  it('with motion on, plays the animated clip for the reaction', () => {
    skip = false;
    const { rerender } = render(<PracticeBuddy reaction={null} typing={false} typingTick={0} />);
    rerender(<PracticeBuddy reaction={{ kind: 'correct', id: 1 }} typing={false} typingTick={0} />);
    // Before the blob is warm it falls back to the clip URL itself.
    expect(screen.getByTestId('practice-buddy-art')).toHaveAttribute('src', BUDDY_CLIPS.correct.src);
    skip = true;
  });

  it('every reaction clip is a real file in public/', async () => {
    const { existsSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    for (const c of Object.values(BUDDY_CLIPS)) {
      for (const f of [c.src, c.still]) expect(existsSync(resolve(__dirname, '../../../../public', '.' + f))).toBe(true);
    }
    expect(existsSync(resolve(__dirname, '../../../../public', '.' + BUDDY_IDLE))).toBe(true);
  });
});
