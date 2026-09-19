/**
 * VocabQuizChestFlow — the student's side of the chest loop.
 *
 * picker (after a correct answer) → emit openChest {index, chest} → lock the
 * picker → reveal on the private result → auto-dismiss. A steal/swap landing
 * on this student shows a kind, non-blocking banner.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Socket } from 'socket.io-client';
import { VocabQuizChestFlow, type VocabQuizChestFlowProps } from '../VocabQuizChestFlow';
import { VOCAB_QUIZ_EVENTS, type TreasureChestState } from '@/shared/types/vocabQuiz';

const t = (key: string, p?: Record<string, string | number>) =>
  p ? `${key} ${Object.values(p).join(' ')}` : key;

const mine: TreasureChestState = { actor: 'ana', outcome: 'gain', amount: 30, standings: [], myScore: 230 };

function renderFlow(over: Partial<VocabQuizChestFlowProps> = {}) {
  const socket = { emit: vi.fn() } as unknown as Socket & { emit: ReturnType<typeof vi.fn> };
  const props: VocabQuizChestFlowProps = {
    socket,
    chestPending: true,
    myChest: null,
    chestHit: null,
    questionIndex: 2,
    ended: false,
    username: 'ana',
    t,
    ...over,
  };
  const utils = render(<VocabQuizChestFlow {...props} />);
  return { ...utils, socket, props };
}

describe('VocabQuizChestFlow', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows three chests after a correct answer', () => {
    renderFlow();
    expect(screen.getAllByRole('button', { name: /chestLabel/ })).toHaveLength(3);
  });

  it('shows nothing when no chest is pending (wrong answer, or chests off)', () => {
    const { container } = renderFlow({ chestPending: false });
    expect(container).toBeEmptyDOMElement();
  });

  it('emits the question index AND the chest tapped, then locks all three', () => {
    const { socket } = renderFlow();
    fireEvent.click(screen.getAllByRole('button', { name: /chestLabel/ })[1]);
    expect(socket.emit).toHaveBeenCalledWith(VOCAB_QUIZ_EVENTS.openChest, { index: 2, chest: 1 });
    screen.getAllByRole('button', { name: /chestLabel/ }).forEach((b) => expect(b).toBeDisabled());
    fireEvent.click(screen.getAllByRole('button', { name: /chestLabel/ })[0]);
    expect(socket.emit).toHaveBeenCalledTimes(1);
  });

  it('reveals my result, then auto-dismisses it', () => {
    renderFlow({ myChest: mine });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('never shows another student\'s chest as mine', () => {
    renderFlow({ myChest: { ...mine, actor: 'ben' }, chestPending: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('unlocks the picker for the next question', () => {
    const { rerender, props } = renderFlow();
    fireEvent.click(screen.getAllByRole('button', { name: /chestLabel/ })[0]);
    rerender(<VocabQuizChestFlow {...props} questionIndex={3} />);
    screen.getAllByRole('button', { name: /chestLabel/ }).forEach((b) => expect(b).not.toBeDisabled());
  });

  it('shows a kind banner when someone steals from me, then hides it', () => {
    renderFlow({ chestPending: false, chestHit: { actor: 'ben', outcome: 'steal', amount: 40, score: 110 } });
    expect(screen.getByRole('status')).toHaveTextContent('vocabQuiz.treasure.hitSteal ben 40');
    act(() => vi.advanceTimersByTime(4500));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('renders nothing once the quiz has ended', () => {
    const { container } = renderFlow({ ended: true, myChest: mine });
    expect(container).toBeEmptyDOMElement();
  });
});
