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

  it('Given no words yet, Then the feed says where words will land and the lesson ring sits at zero', () => {
    const socket = fakeSocket();
    render(<ClassroomLivePanel socket={socket} totalWords={0} lessonWords={['House', 'water']} t={t} />);
    expect(screen.getByTestId('live-feed-empty')).toHaveTextContent('tvBroadcast.wordDropEmpty');
    expect(screen.queryByTestId('live-word-of-round')).toBeNull();
    expect(screen.getByTestId('live-lesson-ring')).toHaveAttribute('data-found', '0');
    expect(screen.getByTestId('live-lesson-ring')).toHaveTextContent('0/2');
  });

  it('Given words land, Then each drops into the feed with its finder, newest first, and the letters stay hidden', () => {
    const socket = fakeSocket();
    render(<ClassroomLivePanel socket={socket} totalWords={2} lessonWords={['house']} hostUsername="Ms" t={t} />);
    act(() => socket.fire('playerFoundWordBatch', { words: [{ username: 'Maya', word: 'planet' }] }));
    act(() => socket.fire('playerFoundWordBatch', { words: [{ username: 'Leo', word: 'stone' }] }));
    const rows = screen.getAllByTestId('live-feed-row');
    expect(rows.map((r) => r.getAttribute('data-name'))).toEqual(['Leo', 'Maya']);
    const feed = screen.getByTestId('live-word-feed');
    expect(feed.textContent).not.toMatch(/planet|stone/i);
    expect(rows[1].querySelectorAll('[data-testid="live-feed-tile"]')).toHaveLength(6);
  });

  it('Given a lesson word is found, Then the feed shows it as a lesson word and the ring counts it', () => {
    const socket = fakeSocket();
    render(<ClassroomLivePanel socket={socket} totalWords={1} lessonWords={['house', 'water']} t={t} />);
    act(() => socket.fire('playerFoundWordBatch', { words: [{ username: 'Maya', word: 'house' }] }));
    const row = screen.getByTestId('live-feed-row');
    expect(row).toHaveAttribute('data-lesson', 'true');
    expect(row).toHaveTextContent(/house/i);
    expect(screen.getByTestId('live-lesson-ring')).toHaveAttribute('data-found', '1');
  });

  it('Given a word lands, Then the longest word of the round shows its length masked and the finder', () => {
    const socket = fakeSocket();
    render(<ClassroomLivePanel socket={socket} totalWords={1} lessonWords={[]} t={t} />);
    act(() => socket.fire('playerFoundWordBatch', { words: [{ username: 'Maya', word: 'planet' }] }));
    const card = screen.getByTestId('live-word-of-round');
    expect(card.textContent).not.toContain('planet');
    expect(card).toHaveTextContent('Maya');
  });

  it('Given a Hebrew word, Then the tile row follows the word direction, not a forced LTR', () => {
    const socket = fakeSocket();
    render(<ClassroomLivePanel socket={socket} totalWords={1} lessonWords={[]} t={t} />);
    act(() => socket.fire('playerFoundWordBatch', { words: [{ username: 'נועה', word: 'שלום' }] }));
    expect(screen.getAllByTestId('live-feed-tile')[0].parentElement).toHaveAttribute('dir', 'auto');
  });

  it('Given no lesson words, Then the lesson ring is not drawn', () => {
    render(<ClassroomLivePanel socket={fakeSocket()} totalWords={0} lessonWords={[]} t={t} />);
    expect(screen.queryByTestId('live-lesson-ring')).toBeNull();
  });

  it('Given a phone, Then the count stacks over its label so the lesson ring keeps its place beside it', () => {
    render(<ClassroomLivePanel socket={fakeSocket()} totalWords={0} lessonWords={['house']} t={t} />);
    const countBlock = screen.getByTestId('live-total-words').parentElement as HTMLElement;
    expect(countBlock.className).toContain('max-md:flex-col');
  });

  it('Given the projector gives the panel less height (a race board under it), Then its type scales to the panel itself, not the screen', () => {
    render(<ClassroomLivePanel socket={fakeSocket()} totalWords={3} lessonWords={['House']} t={t} />);
    expect(screen.getByTestId('classroom-live-panel').className).toContain('md:[container-type:size]');
  });

  it('unsubscribes on unmount', () => {
    const socket = fakeSocket();
    const { unmount } = render(<ClassroomLivePanel socket={socket} totalWords={0} lessonWords={[]} t={t} />);
    expect(socket.count('playerFoundWordBatch')).toBe(1);
    unmount();
    expect(socket.count('playerFoundWordBatch')).toBe(0);
  });
});
