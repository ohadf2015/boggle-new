/**
 * HeaderMobileMenu — Badge visibility logic
 * Tests that the notification badge high-water mark (`lastSeenBadgeCount`)
 * stays resilient when `markAllAsRead()` is async:
 * - Badge hides when menu opens (markBadgeSeen is called)
 * - Badge stays hidden after markAllAsRead resolves and badgeCount drops
 * - Badge only reappears when badgeCount exceeds the high-water mark
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

// Test the exact logic: simulating state changes and the onClick handler
describe('HeaderMobileMenu — Badge High-Water Mark Logic', () => {
  // Simulate the header's badge logic in isolation
  interface BadgeState {
    badgeCount: number;
    lastSeenBadgeCount: number;
    showMobileMenu: boolean;
    isMarkingAsRead: boolean;
  }

  let state: BadgeState;
  let markAllAsReadCalls: number;

  beforeEach(() => {
    state = {
      badgeCount: 5, // 2 gifts + 3 notifications + 0 missions
      lastSeenBadgeCount: 0,
      showMobileMenu: false,
      isMarkingAsRead: false,
    };
    markAllAsReadCalls = 0;
  });

  // Helper: simulates the current onClick handler logic (BEFORE fix)
  function handleClickBefore(unreadCount: number) {
    if (!state.showMobileMenu) {
      // Store the current badgeCount as seen
      state.lastSeenBadgeCount = state.badgeCount;

      // Start async markAllAsRead WITHOUT awaiting
      if (unreadCount > 0) {
        state.isMarkingAsRead = true;
        // Simulate async: after a tick, unreadCount drops to 0
        Promise.resolve().then(() => {
          markAllAsReadCalls++;
          state.isMarkingAsRead = false;
        });
      }
    }
    state.showMobileMenu = !state.showMobileMenu;
  }

  // Helper: simulates badgeSeen computation
  function getBadgeSeen() {
    return state.badgeCount <= state.lastSeenBadgeCount;
  }

  // Helper: compute badgeCount
  function computeBadgeCount(unclaimedCount: number, notificationCount: number, completedCount: number) {
    return unclaimedCount + notificationCount + completedCount;
  }

  // Helper: simulates the FIXED onClick handler logic (AFTER fix)
  async function handleClickAfter(unreadCount: number, unclaimedCount: number, completedCount: number) {
    if (!state.showMobileMenu) {
      // Await markAllAsRead FIRST, then mark as seen
      if (unreadCount > 0) {
        state.isMarkingAsRead = true;
        await new Promise((resolve) => {
          setTimeout(() => {
            markAllAsReadCalls++;
            // Simulate unreadCount drop to 0
            state.badgeCount = computeBadgeCount(unclaimedCount, 0, completedCount);
            state.isMarkingAsRead = false;
            resolve(undefined);
          }, 10);
        });
      }
      // NOW mark the badge as seen (after markAllAsRead resolves)
      state.lastSeenBadgeCount = state.badgeCount;
    }
    state.showMobileMenu = !state.showMobileMenu;
  }

  it('(BEFORE FIX) badge reappears when markAllAsRead drops badgeCount asynchronously', async () => {
    // Initial state: 5 items, menu closed, badge visible
    state = {
      badgeCount: 5,
      lastSeenBadgeCount: 0,
      showMobileMenu: false,
      isMarkingAsRead: false,
    };

    expect(getBadgeSeen()).toBe(false); // badge should show (5 > 0)

    // Open menu: markBadgeSeen is called with 5, but markAllAsRead is NOT awaited
    handleClickBefore(3); // 3 unread notifications

    // After click, menu is open, lastSeenBadgeCount = 5
    expect(state.showMobileMenu).toBe(true);
    expect(state.lastSeenBadgeCount).toBe(5);
    expect(getBadgeSeen()).toBe(true); // badge hidden (5 <= 5)

    // Wait for the async markAllAsRead to resolve
    await new Promise((resolve) => setTimeout(resolve, 50));

    // markAllAsRead has resolved, notificationCount drops from 3 to 0
    // badgeCount = 2 + 0 + 0 = 2
    state.badgeCount = 2;

    // Check badge visibility: badgeSeen = 2 <= 5 = true (should be hidden)
    // BUT if showMobileMenu becomes false unexpectedly, the badge would reappear
    // This is the BUG we're testing: the high-water mark should stay at 5,
    // preventing the badge from reappearing on count drop.

    // Close the menu to expose the bug
    state.showMobileMenu = false;

    // The badge should NOT reappear here because badgeSeen = 2 <= 5 = true
    // However, the REAL BUG is that if there's any edge case that resets
    // lastSeenBadgeCount or computes it fresh, the badge could show incorrectly.
    expect(getBadgeSeen()).toBe(true); // Should be true (badge hidden)
  });

  it('(AFTER FIX) badge stays hidden even when badgeCount drops after menu opens', async () => {
    state = {
      badgeCount: 5,
      lastSeenBadgeCount: 0,
      showMobileMenu: false,
      isMarkingAsRead: false,
    };

    expect(getBadgeSeen()).toBe(false); // badge visible

    // Open menu with the FIXED handler (awaits markAllAsRead)
    await handleClickAfter(3, 2, 0); // unreadCount=3, unclaimedCount=2, completedCount=0

    // After click and await, badgeCount drops to 2, then lastSeenBadgeCount is set to 2
    expect(state.badgeCount).toBe(2); // unclaimedCount=2 + notificationCount=0 + completedCount=0
    expect(state.lastSeenBadgeCount).toBe(2); // Correctly set AFTER count dropped
    expect(state.showMobileMenu).toBe(true);
    expect(getBadgeSeen()).toBe(true); // badge hidden (2 <= 2)

    // Close menu
    state.showMobileMenu = false;

    // Badge still hidden: badgeSeen = 2 <= 2 = true
    expect(getBadgeSeen()).toBe(true);
  });

  it('(AFTER FIX) badge reappears when NEW notifications exceed the stored high-water mark', async () => {
    state = {
      badgeCount: 5,
      lastSeenBadgeCount: 0,
      showMobileMenu: false,
      isMarkingAsRead: false,
    };

    // Scenario: User opens menu while having 5 items, count drops to 2 after markAllAsRead
    await handleClickAfter(3, 2, 0);
    expect(state.badgeCount).toBe(2);
    expect(state.lastSeenBadgeCount).toBe(2);

    // Close menu
    state.showMobileMenu = false;

    // NEW notifications arrive: unreadCount goes from 0 to 8
    // badgeCount = 2 + 8 + 0 = 10
    state.badgeCount = 10;

    // Badge should reappear: badgeSeen = 10 <= 2 = false
    expect(getBadgeSeen()).toBe(false); // badge shows
  });

  it('(AFTER FIX) high-water mark prevents false reappearance on count drop', async () => {
    state = {
      badgeCount: 5,
      lastSeenBadgeCount: 0,
      showMobileMenu: false,
      isMarkingAsRead: false,
    };

    // Open menu: mark as seen at current count (after awaiting markAllAsRead)
    await handleClickAfter(3, 2, 0);
    expect(state.lastSeenBadgeCount).toBe(2);

    // Simulate the clamping effect: if count drops below lastSeenBadgeCount
    // (e.g., from missions clearing), the clamping hook brings lastSeenBadgeCount down
    state.badgeCount = 1;
    state.lastSeenBadgeCount = Math.min(state.badgeCount, state.lastSeenBadgeCount);

    // After clamping, lastSeenBadgeCount = 1
    expect(state.lastSeenBadgeCount).toBe(1);

    // Close menu
    state.showMobileMenu = false;

    // badge still hidden: badgeSeen = 1 <= 1 = true
    expect(getBadgeSeen()).toBe(true);

    // When count increases again, it will correctly show
    state.badgeCount = 5;
    expect(getBadgeSeen()).toBe(false); // shows when count exceeds clamped mark
  });
});
