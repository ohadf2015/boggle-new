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

describe('WordcraftProjectorView — the sideways lesson row shows there is more', () => {
  it('Given 30 words in one phone row, Then the trailing edge fades out (mirrored in RTL) so the row reads as scrollable', () => {
    renderEmbedded();
    const row = screen.getByTestId('lesson-targets-row');
    expect(hasClass(row, 'max-md:[mask-image:linear-gradient(to_right,#000_80%,transparent)]')).toBe(true);
    expect(hasClass(row, 'max-md:rtl:[mask-image:linear-gradient(to_left,#000_80%,transparent)]')).toBe(true);
  });
});
