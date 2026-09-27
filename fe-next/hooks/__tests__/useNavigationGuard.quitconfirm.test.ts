/**
 * useNavigationGuard - Quit Confirmation Test
 *
 * Validates that the navigation guard properly shows custom confirmation dialogs
 * instead of native browser prompts when users attempt to leave during active games.
 *
 * Requirements:
 * 1. All game modes must use useNavigationGuard when game is active
 * 2. Confirmation dialog should appear for back button, navigation attempts
 * 3. Native browser beforeunload prompt should appear ONLY for tab close/refresh
 * 4. After user confirms exit in dialog, navigation should proceed without native prompt
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNavigationGuard, resetPhantomPopStateForTests } from '../useNavigationGuard';

describe('useNavigationGuard - Quit Confirmation Flow', () => {
  let mockPushState: any;
  let mockAddEventListener: any;
  let mockRemoveEventListener: any;

  beforeEach(() => {
    resetPhantomPopStateForTests();
    // Mock window.history
    mockPushState = vi.spyOn(window.history, 'pushState').mockImplementation();

    // Track event listeners
    mockAddEventListener = vi.spyOn(window, 'addEventListener');
    mockRemoveEventListener = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    mockPushState.mockRestore();
    mockAddEventListener.mockRestore();
    mockRemoveEventListener.mockRestore();
  });

  describe('Native Browser Prompt (beforeunload)', () => {
    it('should register beforeunload handler when enabled', () => {
      renderHook(() =>
        useNavigationGuard({
          enabled: true,
          message: 'Test warning',
        })
      );

      expect(mockAddEventListener).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
    });

    it('should NOT register beforeunload handler when disabled', () => {
      renderHook(() =>
        useNavigationGuard({
          enabled: false,
        })
      );

      const beforeunloadCalls = mockAddEventListener.mock.calls.filter(
        ([event]) => event === 'beforeunload'
      );
      expect(beforeunloadCalls).toHaveLength(0);
    });

    it('should trigger beforeunload event with custom message', () => {
      renderHook(() =>
        useNavigationGuard({
          enabled: true,
          message: 'You will lose your progress!',
        })
      );

      // Get the beforeunload handler
      const beforeunloadCall = mockAddEventListener.mock.calls.find(
        ([event]) => event === 'beforeunload'
      );
      expect(beforeunloadCall).toBeDefined();
      const handler = beforeunloadCall![1] as (e: BeforeUnloadEvent) => void;

      // Simulate beforeunload event
      const mockEvent = new Event('beforeunload') as BeforeUnloadEvent;
      const preventDefaultSpy = vi.spyOn(mockEvent, 'preventDefault');

      const result = handler(mockEvent);

      // Browser standard: preventDefault() should be called and message returned
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(result).toBe('You will lose your progress!');
      // Note: returnValue behavior varies across browsers, so we check the return value instead
    });

    it('should cleanup beforeunload handler on unmount', () => {
      const { unmount } = renderHook(() =>
        useNavigationGuard({
          enabled: true,
          message: 'Test warning',
        })
      );

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
    });
  });

  describe('Custom Confirmation Dialog (popstate)', () => {
    it('should register popstate handler when enabled', () => {
      renderHook(() =>
        useNavigationGuard({
          enabled: true,
          onNavigationAttempt: () => false,
        })
      );

      expect(mockAddEventListener).toHaveBeenCalledWith(
        'popstate',
        expect.any(Function)
      );
    });

    it('should push history state to intercept back button', () => {
      renderHook(() =>
        useNavigationGuard({
          enabled: true,
          onNavigationAttempt: () => false,
        })
      );

      expect(mockPushState).toHaveBeenCalledWith(
        { gameGuard: true },
        '',
        window.location.href
      );
    });

    it('should call onNavigationAttempt callback on popstate', () => {
      const onNavigationAttempt = vi.fn(() => false);

      renderHook(() =>
        useNavigationGuard({
          enabled: true,
          onNavigationAttempt,
        })
      );

      // Get the popstate handler
      const popstateCall = mockAddEventListener.mock.calls.find(
        ([event]) => event === 'popstate'
      );
      expect(popstateCall).toBeDefined();
      const handler = popstateCall![1] as () => void;

      // Simulate popstate event (back button)
      act(() => {
        handler();
      });

      expect(onNavigationAttempt).toHaveBeenCalled();
    });

    it('should block navigation when onNavigationAttempt returns false', () => {
      const onNavigationAttempt = vi.fn(() => false);

      renderHook(() =>
        useNavigationGuard({
          enabled: true,
          onNavigationAttempt,
        })
      );

      // Clear previous pushState calls
      mockPushState.mockClear();

      // Get the popstate handler
      const popstateCall = mockAddEventListener.mock.calls.find(
        ([event]) => event === 'popstate'
      );
      const handler = popstateCall![1] as () => void;

      // Simulate back button
      act(() => {
        handler();
      });

      // Should push state again to keep user on page
      expect(mockPushState).toHaveBeenCalledWith(
        { gameGuard: true },
        '',
        window.location.href
      );
    });

    it('should allow navigation when onNavigationAttempt returns true', () => {
      const onNavigationAttempt = vi.fn(() => true);

      renderHook(() =>
        useNavigationGuard({
          enabled: true,
          onNavigationAttempt,
        })
      );

      // Clear previous pushState calls
      mockPushState.mockClear();

      // Get the popstate handler
      const popstateCall = mockAddEventListener.mock.calls.find(
        ([event]) => event === 'popstate'
      );
      const handler = popstateCall![1] as () => void;

      // Simulate back button
      act(() => {
        handler();
      });

      // Should NOT push state again (allow navigation)
      expect(mockPushState).not.toHaveBeenCalled();
    });
  });

  describe('Enable/Disable Toggle', () => {
    it('should register handlers when enabled changes from false to true', () => {
      const { rerender } = renderHook(
        ({ enabled }) =>
          useNavigationGuard({
            enabled,
            onNavigationAttempt: () => false,
          }),
        { initialProps: { enabled: false } }
      );

      // Clear initial calls
      mockAddEventListener.mockClear();
      mockPushState.mockClear();

      // Enable the guard
      rerender({ enabled: true });

      expect(mockAddEventListener).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'popstate',
        expect.any(Function)
      );
      expect(mockPushState).toHaveBeenCalledWith(
        { gameGuard: true },
        '',
        window.location.href
      );
    });

    it('should cleanup handlers when enabled changes from true to false', () => {
      const { rerender } = renderHook(
        ({ enabled }) =>
          useNavigationGuard({
            enabled,
            onNavigationAttempt: () => false,
          }),
        { initialProps: { enabled: true } }
      );

      // Clear initial calls
      mockRemoveEventListener.mockClear();

      // Disable the guard
      rerender({ enabled: false });

      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'popstate',
        expect.any(Function)
      );
    });
  });

  describe('Typical Game Flow', () => {
    it('should handle complete game lifecycle: start → play → quit', () => {
      const onNavigationAttempt = vi.fn(() => {
        // First call: User clicks back button → show dialog → return false
        // This simulates showing the confirmation dialog
        return false;
      });

      const { rerender } = renderHook(
        ({ enabled }) =>
          useNavigationGuard({
            enabled,
            onNavigationAttempt,
          }),
        { initialProps: { enabled: false } }
      );

      // Step 1: Game starts → enable guard
      rerender({ enabled: true });

      expect(mockPushState).toHaveBeenCalledWith(
        { gameGuard: true },
        '',
        window.location.href
      );

      // Step 2: User presses back button
      const popstateCall = mockAddEventListener.mock.calls.find(
        ([event]) => event === 'popstate'
      );
      const handler = popstateCall![1] as () => void;

      mockPushState.mockClear();
      act(() => {
        handler();
      });

      // Should block navigation and show dialog
      expect(onNavigationAttempt).toHaveBeenCalled();
      expect(mockPushState).toHaveBeenCalled(); // Blocked

      // Step 3: User confirms exit in custom dialog → disable guard
      rerender({ enabled: false });

      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'popstate',
        expect.any(Function)
      );
    });
  });

  describe('Cleanup Behavior', () => {
    let mockHistoryBack: any;

    beforeEach(() => {
      // Mock history.back to track if it gets called
      mockHistoryBack = vi.spyOn(window.history, 'back').mockImplementation();
    });

    afterEach(() => {
      mockHistoryBack.mockRestore();
    });

    it('should NOT call history.back() during cleanup - prevents unwanted navigation', () => {
      // BUG: The cleanup function was calling history.back() which triggers navigation
      // without showing the confirmation dialog. This test ensures cleanup doesn't
      // cause unwanted navigation.

      // Mock history.state to simulate having our guard state
      const originalState = window.history.state;
      Object.defineProperty(window.history, 'state', {
        value: { gameGuard: true },
        writable: true,
        configurable: true,
      });

      const { unmount } = renderHook(() =>
        useNavigationGuard({
          enabled: true,
          onNavigationAttempt: () => false,
        })
      );

      // Clear any previous calls
      mockHistoryBack.mockClear();

      // Unmount should cleanup WITHOUT navigating away
      unmount();

      // Should NOT call history.back() - this was the bug!
      // Calling history.back() causes navigation without confirmation dialog
      expect(mockHistoryBack).not.toHaveBeenCalled();

      // Restore original state
      Object.defineProperty(window.history, 'state', {
        value: originalState,
        writable: true,
        configurable: true,
      });
    });

    it('should NOT call history.back() when enabled changes from true to false', () => {
      // Same bug scenario: when game becomes inactive, cleanup shouldn't navigate

      const originalState = window.history.state;
      Object.defineProperty(window.history, 'state', {
        value: { gameGuard: true },
        writable: true,
        configurable: true,
      });

      const { rerender } = renderHook(
        ({ enabled }) =>
          useNavigationGuard({
            enabled,
            onNavigationAttempt: () => false,
          }),
        { initialProps: { enabled: true } }
      );

      mockHistoryBack.mockClear();

      // Disable the guard (simulates game ending or user confirming exit)
      rerender({ enabled: false });

      // Should NOT navigate away
      expect(mockHistoryBack).not.toHaveBeenCalled();

      Object.defineProperty(window.history, 'state', {
        value: originalState,
        writable: true,
        configurable: true,
      });
    });
  });
});
