import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HuntFinishOverlay } from '../HuntFinishOverlay';

vi.mock('@/components/effects/InlineConfetti', () => ({
  InlineConfetti: () => <div data-testid="inline-confetti" />,
}));

const t = (key: string) => key;

describe('HuntFinishOverlay', () => {
  it('Given a lost run, When the board locks, Then it says so close and reveals the word letter by letter', () => {
    render(<HuntFinishOverlay outcome="loss" targetWord="crane" language="en" tier={null} calm={false} onSkip={vi.fn()} t={t} />);
    expect(screen.getByText('closeLoss.soClose')).toBeInTheDocument();
    expect(screen.getByText('wordHunt.results.theTargetWordWas')).toBeInTheDocument();
    const tiles = screen.getAllByTestId('hunt-finish-letter');
    expect(tiles.map(el => el.textContent).join('')).toBe('CRANE');
    expect(screen.queryByTestId('inline-confetti')).toBeNull();
  });

  it('Given a solve, When the board locks, Then the tier praise and the word show with one confetti burst', () => {
    render(
      <HuntFinishOverlay
        outcome="win" targetWord="crane" language="en" calm={false} onSkip={vi.fn()} t={t}
        tier={{ tier: 1, labelKey: 'wordHunt.tier.genius' } as never}
      />,
    );
    expect(screen.getByText('wordHunt.tier.genius')).toBeInTheDocument();
    expect(screen.getAllByTestId('hunt-finish-letter')).toHaveLength(5);
    expect(screen.getAllByTestId('inline-confetti')).toHaveLength(1);
  });

  it('Given reduced effects, When a solve locks the board, Then the word still shows but no confetti fires', () => {
    render(<HuntFinishOverlay outcome="win" targetWord="crane" language="en" tier={null} calm onSkip={vi.fn()} t={t} />);
    expect(screen.getAllByTestId('hunt-finish-letter')).toHaveLength(5);
    expect(screen.queryByTestId('inline-confetti')).toBeNull();
  });

  it('Given the finish beat, When the player taps the board, Then results are asked for right away', () => {
    const onSkip = vi.fn();
    render(<HuntFinishOverlay outcome="loss" targetWord="crane" language="en" tier={null} calm onSkip={onSkip} t={t} />);
    fireEvent.click(screen.getByTestId('hunt-finish'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  describe('when the hidden word is found from the board', () => {
    const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 2 }];
    let animate: ReturnType<typeof vi.fn>;
    const realAnimate = Element.prototype.animate;
    beforeEach(() => {
      animate = vi.fn(() => ({ cancel: vi.fn(), finished: Promise.resolve() }));
      Element.prototype.animate = animate as never;
    });
    afterEach(() => { Element.prototype.animate = realAnimate; });

    function solve(props: Partial<React.ComponentProps<typeof HuntFinishOverlay>> = {}) {
      return render(
        <div>
          {path.map((c) => <div key={`${c.row},${c.col}`} data-tile="" data-row={c.row} data-col={c.col} />)}
          <HuntFinishOverlay
            outcome="win" targetWord="crane" language="en" tier={null} calm={false} onSkip={vi.fn()} t={t}
            sourcePath={path} {...props}
          />
        </div>,
      );
    }

    it('Then each answer letter flies out of its board tile, in path order, all landed within 700ms', () => {
      solve();
      const letters = screen.getAllByTestId('hunt-finish-letter');
      const calls = animate.mock.calls.filter((_, i) => letters.includes(animate.mock.contexts[i] as HTMLElement));
      expect(calls).toHaveLength(5);
      const delays = calls.map(([, opts]) => (opts as KeyframeAnimationOptions).delay as number);
      expect(delays).toEqual([...delays].sort((a, b) => a - b));
      for (const [frames, opts] of calls) {
        const o = opts as KeyframeAnimationOptions;
        expect(((o.delay as number) + (o.duration as number))).toBeLessThanOrEqual(700);
        const keys = (frames as Keyframe[]).flatMap((f) => Object.keys(f).filter((k) => k !== 'offset' && k !== 'easing'));
        expect(new Set(keys)).toEqual(new Set(['transform', 'opacity']));
      }
    });

    it('Then the dim and headline wait for the board stamp before arriving', () => {
      solve();
      expect(screen.getByTestId('hunt-finish').dataset.entry).toBe('stamp');
    });

    it('Given reduced effects, Then nothing flies and the word simply shows', () => {
      solve({ calm: true });
      expect(animate).not.toHaveBeenCalled();
      expect(screen.getAllByTestId('hunt-finish-letter')).toHaveLength(5);
    });

    it('Given a path that does not spell the shown word, Then the letters pop in place instead of flying', () => {
      solve({ sourcePath: path.slice(0, 3) });
      const letters = screen.getAllByTestId('hunt-finish-letter');
      expect(animate.mock.contexts.filter((c) => letters.includes(c as HTMLElement))).toHaveLength(0);
    });
  });

  it('Given a Hebrew word, When revealed, Then final letter forms are applied', () => {
    render(<HuntFinishOverlay outcome="loss" targetWord="שלומ" language="he" tier={null} calm onSkip={vi.fn()} t={t} />);
    expect(screen.getAllByTestId('hunt-finish-letter').map(el => el.textContent).join('')).toBe('שלום');
  });
});
