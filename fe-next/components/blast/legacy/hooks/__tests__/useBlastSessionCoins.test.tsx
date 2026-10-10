import { renderHook, act } from '@testing-library/react';
import { useBlastSessionCoins } from '../useBlastSessionCoins';
import { COIN_EARNED_EVENT } from '@/utils/coinEarnedFx';

function addBoard() {
  const el = document.createElement('div');
  el.setAttribute('data-blast-board', 'true');
  el.getBoundingClientRect = () => ({ left: 0, top: 200, width: 300, height: 300, right: 300, bottom: 500, x: 0, y: 200, toJSON: () => ({}) }) as DOMRect;
  document.body.appendChild(el);
}

describe('useBlastSessionCoins', () => {
  let events: CustomEvent[];
  const onEarn = (e: Event) => events.push(e as CustomEvent);

  beforeEach(() => {
    events = [];
    window.addEventListener(COIN_EARNED_EVENT, onEarn);
  });
  afterEach(() => {
    window.removeEventListener(COIN_EARNED_EVENT, onEarn);
    document.body.innerHTML = '';
  });

  it('launches coins from the word on the board the moment it is accepted, inline into the wallet', () => {
    addBoard();
    const { result } = renderHook(() => useBlastSessionCoins({ isMultiplayer: false, gridSize: 3 }));
    act(() => result.current.launchCoins([{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }], 1));
    expect(events).toHaveLength(1);
    const detail = events[0].detail;
    expect(detail.inline).toBe(true);
    expect(detail.source).toEqual({ x: 150, y: 250 });
    expect(detail.coins).toBeGreaterThanOrEqual(4);
  });

  it('banks the coin delta into the session total without granting anything', () => {
    const { result } = renderHook(() => useBlastSessionCoins({ isMultiplayer: false, gridSize: 3 }));
    act(() => result.current.creditCoins(3));
    act(() => result.current.creditCoins(2));
    expect(result.current.sessionCoins).toBe(5);
    expect(events).toHaveLength(0);
  });

  it('shows the word coins in the wallet as they take off, then settles on the scored amount', () => {
    addBoard();
    const { result } = renderHook(() => useBlastSessionCoins({ isMultiplayer: false, gridSize: 3 }));
    act(() => result.current.launchCoins([{ row: 0, col: 0 }], 2));
    expect(result.current.walletCoins).toBe(2);
    expect(result.current.sessionCoins).toBe(0);
    act(() => result.current.creditCoins(3));
    expect(result.current.walletCoins).toBe(3);
    expect(result.current.sessionCoins).toBe(3);
  });

  it('a score bigger than the estimate sends a second wave of coins for the extra', () => {
    addBoard();
    const { result } = renderHook(() => useBlastSessionCoins({ isMultiplayer: false, gridSize: 3 }));
    act(() => result.current.launchCoins([{ row: 1, col: 1 }], 2));
    act(() => result.current.creditCoins(20));
    expect(events).toHaveLength(2);
    expect(events[1].detail).toMatchObject({ amount: 18, inline: true, source: { x: 150, y: 350 } });
    expect(result.current.walletCoins).toBe(20);
  });

  it('a score at or under the estimate sends no second wave', () => {
    addBoard();
    const { result } = renderHook(() => useBlastSessionCoins({ isMultiplayer: false, gridSize: 3 }));
    act(() => result.current.launchCoins([{ row: 1, col: 1 }], 2));
    act(() => result.current.creditCoins(2));
    expect(events).toHaveLength(1);
  });

  it('does nothing in multiplayer', () => {
    addBoard();
    const { result } = renderHook(() => useBlastSessionCoins({ isMultiplayer: true, gridSize: 3 }));
    act(() => result.current.launchCoins([{ row: 0, col: 0 }], 1));
    act(() => result.current.creditCoins(3));
    expect(events).toHaveLength(0);
    expect(result.current.sessionCoins).toBe(0);
  });
});
