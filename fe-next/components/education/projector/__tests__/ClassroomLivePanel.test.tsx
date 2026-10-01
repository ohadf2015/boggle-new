import { render, screen, cleanup, act } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { ClassroomLivePanel } from '../ClassroomLivePanel';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

function fakeSocket() {
  const handlers: Record<string, ((p: unknown) => void)[]> = {};
  return {
    on: (e: string, fn: (p: unknown) => void) => {
      (handlers[e] ??= []).push(fn);
    },
    off: (e: string, fn: (p: unknown) => void) => {
      handlers[e] = (handlers[e] ?? []).filter((h) => h !== fn);
    },
    fire: (e: string, p: unknown) => (handlers[e] ?? []).forEach((h) => h(p)),
    count: (e: string) => (handlers[e] ?? []).length,
  };
}

describe('ClassroomLivePanel — the host sees the round, the class is not handed answers', () => {
  afterEach(cleanup);

  it('Given no words yet, Then it says the spot is open and shows the lesson meter at zero', () => {
    const socket = fakeSocket();
    render(<ClassroomLivePanel socket={socket} totalWords={0} lessonWords={['House', 'water']} t={t} />);
    expect(screen.getByTestId('live-word-of-round')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('live-lesson-meter')).toHaveTextContent('eduLive.live.lessonFound:{"found":0,"total":2}');
  });

  it('Given a word lands, Then the word of the round shows its length masked and the finder', () => {
    const socket = fakeSocket();
    render(<ClassroomLivePanel socket={socket} totalWords={1} lessonWords={['house']} hostUsername="Ms" t={t} />);
    act(() => socket.fire('playerFoundWordBatch', { words: [{ username: 'Maya', word: 'house' }] }));
    const card = screen.getByTestId('live-word-of-round');
    expect(card).toHaveAttribute('data-empty', 'false');
    expect(screen.getAllByTestId('live-word-tile')).toHaveLength(5);
    expect(card.textContent).not.toContain('house');
    expect(card).toHaveTextContent('Maya');
    expect(screen.getByTestId('live-lesson-meter')).toHaveTextContent('"found":1');
  });

  it('Given a Hebrew word, Then the tile row follows the word direction, not a forced LTR', () => {
    const socket = fakeSocket();
    render(<ClassroomLivePanel socket={socket} totalWords={1} lessonWords={[]} t={t} />);
    act(() => socket.fire('playerFoundWordBatch', { words: [{ username: 'נועה', word: 'שלום' }] }));
    expect(screen.getAllByTestId('live-word-tile')[0].parentElement).toHaveAttribute('dir', 'auto');
  });

  it('Given no lesson words, Then the lesson meter is not drawn', () => {
    render(<ClassroomLivePanel socket={fakeSocket()} totalWords={0} lessonWords={[]} t={t} />);
    expect(screen.queryByTestId('live-lesson-meter')).toBeNull();
  });

  it('Given a phone, Then the count stacks over its label so the lesson meter keeps one line beside it', () => {
    render(<ClassroomLivePanel socket={fakeSocket()} totalWords={0} lessonWords={['house']} t={t} />);
    const countBlock = screen.getByTestId('live-total-words').parentElement as HTMLElement;
    expect(countBlock.className).toContain('max-md:flex-col');
  });

  it('unsubscribes on unmount', () => {
    const socket = fakeSocket();
    const { unmount } = render(<ClassroomLivePanel socket={socket} totalWords={0} lessonWords={[]} t={t} />);
    expect(socket.count('playerFoundWordBatch')).toBe(1);
    unmount();
    expect(socket.count('playerFoundWordBatch')).toBe(0);
  });
});
