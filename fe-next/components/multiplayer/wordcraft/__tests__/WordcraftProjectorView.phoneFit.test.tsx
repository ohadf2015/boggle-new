import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { WordcraftProjectorView } from '../WordcraftProjectorView';
import type { WordcraftLiveSocket } from '../useWordcraftLive';

const TARGETS = Array.from({ length: 30 }, (_, i) => `word${i}`);

function renderEmbedded(leaderboard = [{ username: 'Zed', score: 0 }, { username: 'Ada', score: 4 }]) {
  const handlers: Record<string, (p: unknown) => void> = {};
  const socket: WordcraftLiveSocket = {
    emit: () => {},
    on: (event, fn) => { handlers[event] = fn; },
    off: (event) => { delete handlers[event]; },
  };
  render(
    <WordcraftProjectorView
      socket={socket}
      leaderboard={leaderboard}
      t={(k) => k}
      remainingTime={90}
      embedded
    />,
  );
  act(() => handlers['wordcraft:init']?.({ targets: TARGETS }));
}

const hasClass = (el: HTMLElement, cls: string) => el.className.split(/\s+/).includes(cls);

describe('WordcraftProjectorView — a 390px phone keeps the standings on screen', () => {
  it('Given 30 lesson words, Then on a phone they ride one sideways-scrolling row, wrapping only from md up', () => {
    renderEmbedded();
    const row = screen.getByTestId('lesson-targets-row');
    expect(row.querySelectorAll('[data-testid^="target-"]')).toHaveLength(30);
    expect(hasClass(row, 'max-md:flex-nowrap')).toBe(true);
    expect(hasClass(row, 'max-md:overflow-x-auto')).toBe(true);
    expect(hasClass(row, 'md:flex-wrap')).toBe(true);
  });

  it('Given the row scrolls, Then the found/total count stays outside it, always visible', () => {
    renderEmbedded();
    const count = screen.getByTestId('lesson-targets-count');
    expect(count.textContent).toContain('0/30');
    expect(screen.getByTestId('lesson-targets-row')).not.toContainElement(count);
  });

  it('Given a phone, Then the standings get a guaranteed minimum and the race feed is capped below them', () => {
    renderEmbedded();
    const standings = screen.getByTestId('wordcraft-standings');
    const grid = standings.parentElement as HTMLElement;
    expect(grid.className).toContain('max-md:grid-rows-[minmax(7.5rem,1fr)_auto]');
    expect(hasClass(standings, 'overflow-y-auto')).toBe(true);
    expect(screen.getByTestId('race-activity-panel').className).toContain('max-md:max-h-[6.5rem]');
  });

  it('Given nobody has scored yet, Then the top row is not crowned or lit as the leader', () => {
    renderEmbedded([{ username: 'Ada', score: 0 }, { username: 'Bo', score: 0 }]);
    const top = screen.getByTestId('standing-Ada');
    expect(top.querySelector('svg')).toBeNull();
    expect(top.className).not.toContain('bg-neo-lime');
  });
});
