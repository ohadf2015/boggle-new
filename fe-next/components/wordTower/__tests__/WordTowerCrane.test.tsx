import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import WordTowerCrane from '../WordTowerCrane';

const t = (k: string) => k;

describe('WordTowerCrane — tap-to-drop placement overlay', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the word being placed', () => {
    render(
      <WordTowerCrane word="TREE" consecutiveSloppy={0} onDrop={() => {}} t={t} getOffset={() => 0} />,
    );
    expect(screen.getByText('TREE')).toBeInTheDocument();
  });

  it('a dead-centre drop reports a PERFECT outcome', () => {
    const onDrop = vi.fn();
    render(
      <WordTowerCrane word="TREE" consecutiveSloppy={0} onDrop={onDrop} t={t} getOffset={() => 0} />,
    );
    fireEvent.click(screen.getByTestId('crane-drop'));
    act(() => { vi.advanceTimersByTime(300); });
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop.mock.calls[0][0].quality).toBe('perfect');
    expect(onDrop.mock.calls[0][0].heightMultiplier).toBeGreaterThan(1);
  });

  it('a far-off drop reports a MISS', () => {
    const onDrop = vi.fn();
    render(
      <WordTowerCrane word="TREE" consecutiveSloppy={0} onDrop={onDrop} t={t} getOffset={() => 0.9} />,
    );
    fireEvent.click(screen.getByTestId('crane-drop'));
    act(() => { vi.advanceTimersByTime(300); });
    expect(onDrop.mock.calls[0][0].quality).toBe('miss');
  });

  it('only drops once per render (ignores a second tap)', () => {
    const onDrop = vi.fn();
    render(
      <WordTowerCrane word="TREE" consecutiveSloppy={0} onDrop={onDrop} t={t} getOffset={() => 0} />,
    );
    const btn = screen.getByTestId('crane-drop');
    fireEvent.click(btn);
    fireEvent.click(btn); // ignored — already falling
    act(() => { vi.advanceTimersByTime(300); });
    expect(onDrop).toHaveBeenCalledTimes(1);
  });

  it('reports the signed drop offset via onSignedDrop (feeds tower-lean)', () => {
    const onSigned = vi.fn();
    render(
      <WordTowerCrane
        word="TREE"
        consecutiveSloppy={0}
        onDrop={() => {}}
        onSignedDrop={onSigned}
        t={t}
        getOffset={() => -0.4}
      />,
    );
    fireEvent.click(screen.getByTestId('crane-drop'));
    expect(onSigned).toHaveBeenCalledWith(-0.4);
  });
});
