/**
 * BlastLoadingGate — the MP "Generating grid..." recovery ladder (t_67330c55).
 *
 * Covers acceptance (a)–(d):
 *  (a) grid present + dictionary pending → dictionary status + Retry at 8s,
 *      Retry calls the dictionary retry
 *  (b) MP grid missing → board status at 8s, Retry fires the grid resync
 *  (c) growth:blast_board_wait once on clear with the right waited_for;
 *      growth:blast_board_stuck once at 15s, never if the board arrives at 10s
 *  (d) Back to lobby at 30s
 */
import { vi, type Mock } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
}));

import { trackGrowthEvent } from '@/utils/growthTracking';
import { BlastLoadingGate } from '../BlastLoadingGate';

const trackMock = trackGrowthEvent as unknown as Mock;

const T: Record<string, string> = {
  'blast.generating': 'Generating grid...',
  'blast.loadingDictionary': 'Loading the dictionary…',
  'blast.waitingForBoard': 'Waiting for the board from the host…',
  'blast.retryLoading': 'Retry',
  'blast.backToLobby': 'Back to lobby',
};
const t = (key: string) => T[key] ?? key;

function makeProps(overrides: Partial<Parameters<typeof BlastLoadingGate>[0]> = {}) {
  return {
    gridReady: false,
    dictionaryReady: false,
    mode: 'mp' as const,
    language: 'en' as const,
    t,
    onDictionaryRetry: vi.fn(),
    onGridRetry: vi.fn(),
    onBackToLobby: vi.fn(),
    ...overrides,
  };
}

describe('BlastLoadingGate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    trackMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('(a) shows the dictionary status + Retry at 8s when only the dictionary is pending, and Retry calls the dictionary retry', () => {
    const props = makeProps({ gridReady: true, dictionaryReady: false });
    render(<BlastLoadingGate {...props} />);

    // Before 8s: spinner only, no recovery UI
    expect(screen.queryByTestId('blast-loading-recovery')).toBeNull();

    act(() => { vi.advanceTimersByTime(8000); });

    expect(screen.getByTestId('blast-loading-dictionary-status').textContent).toBe(T['blast.loadingDictionary']);
    expect(screen.queryByTestId('blast-loading-board-status')).toBeNull();

    fireEvent.click(screen.getByTestId('blast-loading-retry'));
    expect(props.onDictionaryRetry).toHaveBeenCalledTimes(1);
    expect(props.onGridRetry).not.toHaveBeenCalled();
  });

  it('(b) shows the board status at 8s when the MP grid is missing, and Retry fires the grid resync', () => {
    const props = makeProps({ gridReady: false, dictionaryReady: true, mode: 'mp' });
    render(<BlastLoadingGate {...props} />);

    act(() => { vi.advanceTimersByTime(8000); });

    expect(screen.getByTestId('blast-loading-board-status').textContent).toBe(T['blast.waitingForBoard']);
    expect(screen.queryByTestId('blast-loading-dictionary-status')).toBeNull();

    fireEvent.click(screen.getByTestId('blast-loading-retry'));
    expect(props.onGridRetry).toHaveBeenCalledTimes(1);
    expect(props.onDictionaryRetry).not.toHaveBeenCalled();
  });

  it("(c) emits blast_board_wait exactly once on clear with waited_for 'both'", () => {
    const props = makeProps({ gridReady: false, dictionaryReady: false });
    const { rerender, unmount } = render(<BlastLoadingGate {...props} />);

    act(() => { vi.advanceTimersByTime(10000); });

    // Board arrives: gate unmounts on the next BlastGame render.
    rerender(<BlastLoadingGate {...props} gridReady dictionaryReady />);
    unmount();

    const waits = trackMock.mock.calls.filter(([e]) => e === 'blast_board_wait');
    expect(waits).toHaveLength(1);
    expect(waits[0][1]).toMatchObject({
      waited_for: 'both',
      mode: 'mp',
      language: 'en',
      wait_ms: 10000,
    });
  });

  it('(c) emits blast_board_stuck once at 15s while still waiting — and never when the board arrives at 10s', () => {
    // Still stuck past 15s: fires exactly once, even at 30s+
    const stuckProps = makeProps({ gridReady: false, dictionaryReady: true });
    const stuck = render(<BlastLoadingGate {...stuckProps} />);
    act(() => { vi.advanceTimersByTime(15000); });
    act(() => { vi.advanceTimersByTime(20000); });
    const stucks = trackMock.mock.calls.filter(([e]) => e === 'blast_board_stuck');
    expect(stucks).toHaveLength(1);
    expect(stucks[0][1]).toMatchObject({ waited_for: 'grid', mode: 'mp', language: 'en' });
    stuck.unmount();

    trackMock.mockClear();

    // Board arrives at 10s: no stuck event, and wait_ms reflects the real wait
    const okProps = makeProps({ gridReady: false, dictionaryReady: true });
    const ok = render(<BlastLoadingGate {...okProps} />);
    act(() => { vi.advanceTimersByTime(10000); });
    ok.rerender(<BlastLoadingGate {...okProps} gridReady dictionaryReady />);
    ok.unmount();
    expect(trackMock.mock.calls.filter(([e]) => e === 'blast_board_stuck')).toHaveLength(0);
    const waits = trackMock.mock.calls.filter(([e]) => e === 'blast_board_wait');
    expect(waits).toHaveLength(1);
    expect(waits[0][1]).toMatchObject({ waited_for: 'grid', wait_ms: 10000 });
  });

  it('(d) offers Back to lobby at 30s and it calls onBackToLobby', () => {
    const props = makeProps();
    render(<BlastLoadingGate {...props} />);

    act(() => { vi.advanceTimersByTime(15000); });
    expect(screen.queryByTestId('blast-loading-back-to-lobby')).toBeNull();

    act(() => { vi.advanceTimersByTime(15000); });
    const back = screen.getByTestId('blast-loading-back-to-lobby');
    expect(back.textContent).toBe(T['blast.backToLobby']);

    fireEvent.click(back);
    expect(props.onBackToLobby).toHaveBeenCalledTimes(1);
  });

  it('emits no wait event when the user leaves before the board is ready', () => {
    const props = makeProps();
    const { unmount } = render(<BlastLoadingGate {...props} />);
    act(() => { vi.advanceTimersByTime(5000); });
    unmount(); // quit while still waiting — an abandon, not a wait
    expect(trackMock.mock.calls.filter(([e]) => e === 'blast_board_wait')).toHaveLength(0);
  });
});
