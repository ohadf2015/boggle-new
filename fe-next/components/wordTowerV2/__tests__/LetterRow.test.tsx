import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AUTO_BUILD_MS, LetterRow, WordBox } from '../LetterRow';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${Object.values(p).join(',')}` : k);

function row(over: Partial<Parameters<typeof LetterRow>[0]> = {}) {
  const props = {
    t,
    tray: ['ש', 'ד', 'ה', 'ק', 'ו'],
    selected: [] as number[],
    placing: false,
    canBuild: false,
    reducedMotion: true,
    dir: 'rtl' as const,
    onSelectTile: vi.fn(),
    onDeselectTile: vi.fn(),
    onSubmit: vi.fn(),
    onDrop: vi.fn(),
    ...over,
  };
  render(<LetterRow {...props} />);
  return props;
}

describe('LetterRow', () => {
  it('given the letters, when rendered, then they sit in ONE row the drag hook and the coach can find', () => {
    const { container } = render(
      <LetterRow t={t} tray={['A', 'B', 'C']} selected={[]} placing={false} canBuild={false} reducedMotion dir="ltr" onSelectTile={vi.fn()} onDeselectTile={vi.fn()} onSubmit={vi.fn()} onDrop={vi.fn()} />,
    );
    const tiles = container.querySelectorAll('[data-wheel-index]');
    expect(tiles).toHaveLength(3);
    expect(new Set([...tiles].map((el) => el.parentElement))).toHaveProperty('size', 1);
  });

  it('given a free letter, when tapped, then it is added', () => {
    const p = row();
    fireEvent.click(screen.getByLabelText('wordTower.a11y.tile:ד'));
    expect(p.onSelectTile).toHaveBeenCalledWith(1);
  });

  it('given a used letter, when tapped, then the word rewinds to before it', () => {
    const p = row({ selected: [0, 1] });
    fireEvent.click(screen.getByLabelText('wordTower.a11y.tile:ש'));
    expect(p.onDeselectTile).toHaveBeenCalledWith(0);
    expect(p.onSelectTile).not.toHaveBeenCalled();
  });

  it('given used letters, when rendered, then each shows its place in the word', () => {
    row({ selected: [2, 0] });
    expect(screen.getByLabelText('wordTower.a11y.tile:ה').textContent).toContain('1');
    expect(screen.getByLabelText('wordTower.a11y.tile:ש').textContent).toContain('2');
  });

  it('given no real word yet, when rendered, then the build button is disabled', () => {
    row({ selected: [0] });
    expect((screen.getByLabelText('wordTower.hud.build') as HTMLButtonElement).disabled).toBe(true);
  });

  it('given a real word, when the build button is tapped, then the word goes to the crane once', () => {
    vi.useFakeTimers();
    const p = row({ selected: [0, 1, 2], canBuild: true });
    fireEvent.click(screen.getByLabelText('wordTower.hud.build'));
    act(() => vi.advanceTimersByTime(AUTO_BUILD_MS + 50));
    expect(p.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('given a real word left alone, when the beat passes, then it builds by itself (as the wheel did)', () => {
    vi.useFakeTimers();
    const p = row({ selected: [0, 1, 2], canBuild: true });
    act(() => vi.advanceTimersByTime(AUTO_BUILD_MS - 50));
    expect(p.onSubmit).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(100));
    expect(p.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('given a floor on the hook, when the button is tapped, then it drops and the letters rest', () => {
    const p = row({ selected: [0, 1, 2], placing: true });
    fireEvent.click(screen.getByLabelText('wordTower.crane.drop'));
    expect(p.onDrop).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText('wordTower.a11y.tile:ק') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('WordBox', () => {
  it('given no letters, when rendered, then it invites the first tap', () => {
    render(<WordBox t={t} word="" placing={false} reducedMotion />);
    expect(screen.getByText('wordTower.hud.pickLetters')).toBeTruthy();
  });

  it('given a word, when rendered, then it shows the word', () => {
    render(<WordBox t={t} word="שדה" placing={false} reducedMotion />);
    expect(screen.getByText('שדה')).toBeTruthy();
  });
});
