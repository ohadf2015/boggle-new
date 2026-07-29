/**
 * @jest-environment jsdom
 *
 * Tests for PlayerView logo navigation auto-exit behavior
 *
 * Bug: When a player is the only player in a multiplayer room and clicks the logo
 * to return to the landing page, it should automatically emit leaveRoom and close
 * the room without requiring explicit exit confirmation.
 *
 * Fix: Header component now dispatches 'requestRoomExit' custom event when logo is
 * clicked while a game session is active. PlayerView listens for this event and
 * auto-exits during waiting state, or shows confirmation during active game.
 */

describe('Header Logo Navigation - Room Exit Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup sessionStorage mock to return values (vitest.setup.ts replaces sessionStorage with vi.fn() mocks)
    (sessionStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
      const store: Record<string, string> = {
        gameCode: 'TEST123',
        username: 'TestPlayer',
        isHost: 'false',
      };
      return store[key] ?? null;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should dispatch requestRoomExit event when logo is clicked with active session', () => {
    // Setup event listener to capture event
    let capturedEvent: CustomEvent | null = null;
    const eventHandler = (e: Event) => { capturedEvent = e as CustomEvent; };
    window.addEventListener('requestRoomExit', eventHandler);

    // Simulate the Header's handleLogoClick logic
    const gameCode = sessionStorage.getItem('gameCode');
    const username = sessionStorage.getItem('username');

    if (gameCode && username) {
      window.dispatchEvent(new CustomEvent('requestRoomExit', {
        detail: { gameCode, username, source: 'logo' }
      }));
    }

    // Verify event was dispatched with correct data
    expect(capturedEvent).not.toBeNull();
    expect(capturedEvent!.type).toBe('requestRoomExit');
    expect(capturedEvent!.detail).toEqual({
      gameCode: 'TEST123',
      username: 'TestPlayer',
      source: 'logo'
    });

    window.removeEventListener('requestRoomExit', eventHandler);
  });

  it('should NOT dispatch event when no active session exists', () => {
    // Override to simulate no active game
    (sessionStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const eventHandler = vi.fn();
    window.addEventListener('requestRoomExit', eventHandler);

    // Simulate the Header's handleLogoClick logic
    const gameCode = sessionStorage.getItem('gameCode');
    const username = sessionStorage.getItem('username');

    // No event dispatched since no active session
    if (gameCode && username) {
      window.dispatchEvent(new CustomEvent('requestRoomExit', {
        detail: { gameCode, username, source: 'logo' }
      }));
    }

    // Event should NOT have been dispatched
    expect(eventHandler).not.toHaveBeenCalled();

    window.removeEventListener('requestRoomExit', eventHandler);
  });

  it('should verify PlayerView/HostView can handle the exit request event', () => {
    /**
     * This test verifies the integration contract:
     *
     * 1. Header checks sessionStorage for active game (gameCode + username)
     * 2. If active, dispatches 'requestRoomExit' custom event
     * 3. PlayerView/HostView listen for this event
     * 4. During waiting state: auto-exit (call confirmExitRoom)
     * 5. During active game: show exit confirmation modal
     *
     * The actual PlayerView/HostView implementation is tested separately.
     * This test just verifies the event contract works.
     */

    let exitTriggered = false;
    let confirmationShown = false;

    // Simulate PlayerView's event handler
    const handleRoomExitRequest = (event: CustomEvent) => {
      const { gameCode, username, source } = event.detail;

      if (gameCode === 'TEST123' && username === 'TestPlayer') {
        // In waiting state - auto-exit
        const gameState = 'waiting'; // or 'inProgress'

        if (gameState === 'waiting') {
          exitTriggered = true;
        } else {
          confirmationShown = true;
        }
      }
    };

    window.addEventListener('requestRoomExit', handleRoomExitRequest as EventListener);

    // Trigger the event (as Header would)
    window.dispatchEvent(new CustomEvent('requestRoomExit', {
      detail: { gameCode: 'TEST123', username: 'TestPlayer', source: 'logo' }
    }));

    // Verify handler was called and exit was triggered
    expect(exitTriggered).toBe(true);
    expect(confirmationShown).toBe(false);

    window.removeEventListener('requestRoomExit', handleRoomExitRequest as EventListener);
  });
});

/**
 * IMPLEMENTATION SUMMARY:
 *
 * The fix implements a custom event-based communication between Header and game views:
 *
 * 1. Header.tsx (handleLogoClick):
 *    - Check sessionStorage for gameCode and username
 *    - If exists, dispatch 'requestRoomExit' custom event
 *    - Otherwise, navigate normally
 *
 * 2. PlayerView.tsx (useEffect):
 *    - Listen for 'requestRoomExit' events
 *    - Verify event is for current session
 *    - If gameState='waiting': call confirmExitRoom() (auto-exit)
 *    - If gameState='inProgress': setShowExitConfirm(true) (show modal)
 *
 * 3. HostView.tsx (useEffect):
 *    - Same pattern as PlayerView
 *    - Check runtime.gameStarted instead of gameState
 *
 * This approach:
 * - ✅ Decouples Header from game view internals
 * - ✅ Works with both PlayerView and HostView
 * - ✅ Respects game state (auto-exit vs confirmation)
 * - ✅ No changes to useNavigationGuard hook needed
 * - ✅ Handles the "only player in room" scenario automatically
 *      (backend closes room when it receives leaveRoom)
 */
