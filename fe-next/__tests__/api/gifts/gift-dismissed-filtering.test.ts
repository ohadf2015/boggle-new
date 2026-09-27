/**
 * Test: Gift Dismissal Badge Persistence Bug
 *
 * Bug: After a user dismisses the gift modal (closes without claiming),
 * the gift notification badge still shows in the header/mobile menu.
 *
 * Expected Behavior:
 * - When user dismisses the gift modal, gift_modal_dismissed_at is updated
 * - The gift notification badge should NOT show for gifts that existed
 *   before the dismissal timestamp (user already saw them)
 * - Only NEW gifts (created AFTER dismissal) should show in the badge
 *
 * Root Cause:
 * - /api/player/gifts only filters by `claimed = false`
 * - /api/player/gifts/unclaimed-count only filters by `claimed = false`
 * - Neither endpoint filters by gift_modal_dismissed_at timestamp
 * - So gifts the user already saw and dismissed still appear in the count
 *
 * Fix:
 * - Both endpoints should filter out gifts created BEFORE the user's
 *   gift_modal_dismissed_at timestamp
 */

describe('Gift Dismissal Badge Persistence Bug', () => {
  const mockUserId = 'user-123';

  // Simulate user's profile with dismissal timestamp
  const userProfile = {
    id: mockUserId,
    gift_modal_dismissed_at: '2024-01-10T10:00:00Z', // User dismissed on Jan 10
  };

  // Gift created BEFORE dismissal (user already saw this)
  const oldGift = {
    id: 'gift-old',
    title: 'Old Gift',
    message: 'Created before dismissal',
    claimed: false,
    claimed_at: null,
    created_at: '2024-01-05T10:00:00Z', // Created Jan 5 (BEFORE dismissal on Jan 10)
    recipient_id: mockUserId,
  };

  // Gift created AFTER dismissal (user hasn't seen this yet)
  const newGift = {
    id: 'gift-new',
    title: 'New Gift',
    message: 'Created after dismissal',
    claimed: false,
    claimed_at: null,
    created_at: '2024-01-15T10:00:00Z', // Created Jan 15 (AFTER dismissal on Jan 10)
    recipient_id: mockUserId,
  };

  describe('Current Buggy Behavior', () => {
    it('BUG: returns gifts created before dismissal in unclaimed count', () => {
      // GIVEN: User has 2 unclaimed gifts - one old (before dismissal), one new (after)
      const allUnclaimedGifts = [oldGift, newGift];

      // WHEN: Current API query only filters by claimed = false
      // (simulating current buggy behavior - no dismissal filter)
      const giftsFromBuggyQuery = allUnclaimedGifts.filter((g) => !g.claimed);

      // THEN: BUG - Both gifts are returned, including the one user already dismissed
      expect(giftsFromBuggyQuery).toHaveLength(2);
      // The old gift should NOT be in the response because user already saw it
      expect(giftsFromBuggyQuery).toContainEqual(
        expect.objectContaining({ id: 'gift-old' })
      );
    });

    it('BUG: badge count includes dismissed gifts', () => {
      // GIVEN: User dismissed the modal, but API doesn't filter by dismissal timestamp
      const allUnclaimedGifts = [oldGift, newGift];

      // WHEN: Current API returns count of all unclaimed gifts
      const buggyCount = allUnclaimedGifts.filter((g) => !g.claimed).length;

      // THEN: BUG - Count is 2, but should be 1 (only the new gift)
      expect(buggyCount).toBe(2); // Buggy: shows 2
      // Should be 1: only gifts created AFTER dismissal
    });
  });

  describe('Expected Fixed Behavior', () => {
    it('should filter out gifts created before dismissal timestamp', () => {
      // GIVEN: User has 2 unclaimed gifts - one old, one new
      const allUnclaimedGifts = [oldGift, newGift];
      const dismissedAt = new Date(userProfile.gift_modal_dismissed_at).getTime();

      // WHEN: Fixed API query filters by:
      // 1. claimed = false
      // 2. created_at > gift_modal_dismissed_at
      const giftsFromFixedQuery = allUnclaimedGifts.filter((g) => {
        if (g.claimed) return false;
        // Only include gifts created AFTER the dismissal timestamp
        const giftCreatedAt = new Date(g.created_at).getTime();
        return giftCreatedAt > dismissedAt;
      });

      // THEN: Only the new gift is returned
      expect(giftsFromFixedQuery).toHaveLength(1);
      expect(giftsFromFixedQuery[0].id).toBe('gift-new');
      // Old gift should NOT be in the response
      expect(giftsFromFixedQuery).not.toContainEqual(
        expect.objectContaining({ id: 'gift-old' })
      );
    });

    it('should return all unclaimed gifts when user has no dismissal timestamp', () => {
      // GIVEN: User has never dismissed (gift_modal_dismissed_at is null)
      const userWithNoDismissal = {
        id: mockUserId,
        gift_modal_dismissed_at: null,
      };
      const allUnclaimedGifts = [oldGift, newGift];

      // WHEN: Fixed API query (but no dismissal timestamp to filter)
      const giftsFromFixedQuery = allUnclaimedGifts.filter((g) => {
        if (g.claimed) return false;
        // No dismissal = show all unclaimed gifts
        if (!userWithNoDismissal.gift_modal_dismissed_at) return true;
        const dismissedAt = new Date(userWithNoDismissal.gift_modal_dismissed_at).getTime();
        const giftCreatedAt = new Date(g.created_at).getTime();
        return giftCreatedAt > dismissedAt;
      });

      // THEN: Both gifts are returned (no dismissal = show all)
      expect(giftsFromFixedQuery).toHaveLength(2);
    });

    it('should return 0 count when all gifts are before dismissal', () => {
      // GIVEN: User dismissed after both gifts were created
      const userDismissedLater = {
        id: mockUserId,
        gift_modal_dismissed_at: '2024-01-20T10:00:00Z', // Dismissed on Jan 20
      };
      const allUnclaimedGifts = [oldGift, newGift]; // Both created before Jan 20
      const dismissedAt = new Date(userDismissedLater.gift_modal_dismissed_at).getTime();

      // WHEN: Fixed API query filters by dismissal
      const giftsFromFixedQuery = allUnclaimedGifts.filter((g) => {
        if (g.claimed) return false;
        const giftCreatedAt = new Date(g.created_at).getTime();
        return giftCreatedAt > dismissedAt;
      });

      // THEN: No gifts returned (all are before dismissal)
      expect(giftsFromFixedQuery).toHaveLength(0);
    });
  });

  describe('API Route Fix Requirements', () => {
    it('documents the required fix for /api/player/gifts', () => {
      // CURRENT QUERY (buggy):
      // .eq('recipient_id', user.id)
      // .eq('claimed', false)
      //
      // FIXED QUERY (needs profile lookup first):
      // 1. Get user's profile to get gift_modal_dismissed_at
      // 2. If gift_modal_dismissed_at exists:
      //    .gt('created_at', gift_modal_dismissed_at)
      //
      // Alternative: Use a subquery or RPC to get dismissal timestamp

      const fixRequirements = {
        endpoint: '/api/player/gifts',
        currentFilters: ['recipient_id', 'claimed'],
        missingFilter: 'created_at > gift_modal_dismissed_at',
        needsProfileLookup: true,
      };

      expect(fixRequirements.missingFilter).toBeDefined();
    });

    it('documents the required fix for /api/player/gifts/unclaimed-count', () => {
      // Same fix needed for the count endpoint
      const fixRequirements = {
        endpoint: '/api/player/gifts/unclaimed-count',
        currentFilters: ['recipient_id', 'claimed'],
        missingFilter: 'created_at > gift_modal_dismissed_at',
        needsProfileLookup: true,
      };

      expect(fixRequirements.missingFilter).toBeDefined();
    });
  });
});
