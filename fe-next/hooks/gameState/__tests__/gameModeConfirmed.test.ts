/**
 * Test: gameModeConfirmed gates mode-specific rendering until the SERVER confirms
 * the concrete mode for the current round — preventing the "MP loads one mode then
 * swaps to another mid-load" bug.
 *
 * Root cause being locked down: `gameModeConfirmed` must mean "the server's startGame
 * payload set the mode for THIS round." Client-side / lobby writes (URL ?mode= param,
 * host mode picker) are TENTATIVE and must NOT trip the gate — otherwise the in-game
 * view mounts on an optimistic/stale mode and visibly swaps when the real startGame
 * arrives.
 *
 * Contract:
 *   - setGameMode(mode)      → tentative client selection: sets mode, leaves confirmed FALSE
 *   - confirmGameMode(mode)  → authoritative server path: sets mode + confirmed TRUE atomically
 *   - batchStartGame(...)    → authoritative server path: confirmed TRUE
 *   - resetForNewRound()     → re-gate: confirmed back to FALSE until the next server confirm
 */
import { useGameStore } from '../store';

describe('gameModeConfirmed', () => {
  beforeEach(() => {
    useGameStore.getState().resetAll();
  });

  it('is false in initialState', () => {
    expect(useGameStore.getState().gameModeConfirmed).toBe(false);
  });

  it('stays FALSE after setGameMode — a tentative client selection is not a server confirm', () => {
    useGameStore.getState().setGameMode('blast');
    expect(useGameStore.getState().gameMode).toBe('blast');
    expect(useGameStore.getState().gameModeConfirmed).toBe(false);
  });

  it('stays FALSE after setGameMode with classic', () => {
    useGameStore.getState().setGameMode('classic');
    expect(useGameStore.getState().gameModeConfirmed).toBe(false);
  });

  it('confirmGameMode sets mode AND confirmed in one atomic update', () => {
    const before = useGameStore.getState();
    before.confirmGameMode('blast');
    const after = useGameStore.getState();
    expect(after.gameMode).toBe('blast');
    expect(after.gameModeConfirmed).toBe(true);
  });

  it('confirmGameMode overrides a prior tentative selection (URL ?mode= then server roll)', () => {
    useGameStore.getState().setGameMode('word-hunt'); // optimistic from URL param
    expect(useGameStore.getState().gameModeConfirmed).toBe(false);
    useGameStore.getState().confirmGameMode('blast'); // server resolved random -> blast
    expect(useGameStore.getState().gameMode).toBe('blast');
    expect(useGameStore.getState().gameModeConfirmed).toBe(true);
  });

  it('becomes true after batchStartGame without explicit gameMode', () => {
    useGameStore.getState().batchStartGame({ gameActive: true });
    expect(useGameStore.getState().gameModeConfirmed).toBe(true);
  });

  it('becomes true after batchStartGame with explicit gameMode', () => {
    useGameStore.getState().batchStartGame({ gameMode: 'blast', gameActive: true });
    expect(useGameStore.getState().gameModeConfirmed).toBe(true);
  });

  it('resets to false after resetAll', () => {
    useGameStore.getState().confirmGameMode('blast');
    expect(useGameStore.getState().gameModeConfirmed).toBe(true);
    useGameStore.getState().resetAll();
    expect(useGameStore.getState().gameModeConfirmed).toBe(false);
  });

  it('resets to FALSE after resetForNewRound — re-gates until the next round is server-confirmed', () => {
    useGameStore.getState().confirmGameMode('classic');
    expect(useGameStore.getState().gameModeConfirmed).toBe(true);
    useGameStore.getState().resetForNewRound();
    expect(useGameStore.getState().gameModeConfirmed).toBe(false);
  });
});
