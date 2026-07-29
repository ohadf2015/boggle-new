# Root Cause Analysis: Admin Gift System Bugs

**Date:** 2026-01-19
**Issue:** Multiple Admin Gift System Bugs
**Severity:** High
**Status:** Analysis Complete

---

## Issue Summary

### Bug 1: Gift Modal Reappearing Endlessly
**Description:** After claiming a gift, the modal keeps reappearing endlessly instead of staying dismissed.

**Expected Behavior:**
- After claiming all gifts and dismissing modal, modal should NOT auto-show again
- `gift_modal_dismissed_at` should persist and prevent future auto-shows

**Actual Behavior:**
- Gift modal keeps reappearing even after dismissal
- Modal persists across page refreshes

### Bug 2: Gift Not Auto-Showing on New Gift
**Description:** When admin sends a new gift, the modal does not automatically appear for the recipient.

**Expected Behavior:**
- When user has unclaimed gifts AND `gift_modal_dismissed_at` is NULL, modal auto-shows after 3 seconds

**Actual Behavior:**
- New gifts don't trigger auto-show even when dismissal timestamp is NULL

### Bug 3: Badge Not Showing in Gift Modal
**Description:** When a badge is attached to a gift, it's not displayed in the gift modal UI.

**Expected Behavior:**
- Gift modal should show the attached badge with icon, name, and rarity

**Actual Behavior:**
- Badge is not rendered anywhere in the `AdminGiftModal` component

### Bug 4: Badge Names All Show "name"
**Description:** Badges in the badge selector show "name" instead of their actual names.

**Expected Behavior:**
- Badge names should be extracted from `name_key` (e.g., `collectible.badge.guardian_of_words` → "Guardian Of Words")

**Actual Behavior:**
- Name extraction logic may be failing, showing raw key or "name"

### Feature Request: Show XP/Coins Before and After
**Description:** User wants to see their XP and coin balance before claiming AND after claiming the gift.

---

## Root Cause Analysis

### Bug 1: Gift Modal Reappearing - Root Cause

**Location:** `Header.tsx:94-117` (auto-show effect)

**Root Cause:** The dismissal check has a timing/state race condition.

```typescript
// Header.tsx:94-117
useEffect(() => {
  // Don't auto-show if user has previously dismissed the modal (persisted in DB)
  if (profile?.gift_modal_dismissed_at) {
    return;
  }
  // ... auto-show logic
}, [gifts, showGiftModal, profile?.gift_modal_dismissed_at]);
```

**Issues Identified:**

1. **Profile Not Refreshed After Dismissal:** The `refreshProfile()` is called in `handleDismissGiftModal` but it's async and the effect dependencies might re-trigger before profile updates.

2. **`gifts` Array Triggers Re-run:** The `fetchGifts()` call in the hook may return the same gifts (with `claimed: true`), but since it's a new array reference, the effect re-runs.

3. **Race Condition in `locallyClaimedIdsRef`:** The `useUnclaimedGifts` hook uses a ref to track locally claimed gifts, but this doesn't persist across the component lifecycle properly.

**Evidence:** Looking at `useUnclaimedGifts.ts:153-159`:
```typescript
const mergedGifts = fetchedGifts.map(fetchedGift => {
  if (locallyClaimedIdsRef.current.has(fetchedGift.id)) {
    return { ...fetchedGift, claimed: true, claimed_at: ... };
  }
  return fetchedGift;
});
```

The ref persists, but when the component re-mounts or the effect re-runs, the gifts array is a NEW reference each time, triggering the auto-show effect.

---

### Bug 2: New Gift Not Auto-Showing - Root Cause

**Location:** `Header.tsx:94-117` and database state

**Root Cause:** The `gift_modal_dismissed_at` field is being SET when any gift modal is dismissed, and it's NEVER RESET when new gifts arrive.

**Current Logic:**
1. User receives Gift A
2. Modal auto-shows (dismissed_at is NULL)
3. User claims Gift A and closes modal
4. `dismiss-modal` API is called → `gift_modal_dismissed_at = NOW()`
5. Admin sends Gift B
6. Modal does NOT auto-show because `gift_modal_dismissed_at` is still set

**The Problem:** The dismissal timestamp should be RESET when new gifts arrive, so auto-show works for new gifts.

**Fix Strategy:** When a new gift is sent/received:
- Either reset `gift_modal_dismissed_at` to NULL
- OR track dismissal per-gift instead of globally

---

### Bug 3: Badge Not Showing in Modal - Root Cause

**Location:** `AdminGiftModal.tsx` and API routes

**Root Cause:** The badge is NOT being fetched or displayed in the gift modal component.

**Evidence:**

1. **API doesn't return badge info:** Looking at `/api/player/gifts/route.ts:41-52`:
```typescript
const { data: gifts, error: giftsError } = await supabase
  .from('admin_gift_messages')
  .select(`
    id, title, message, template_type, image_url,
    xp_amount, coin_amount, claimed, claimed_at, created_at,
    sender:profiles!admin_gift_messages_sender_id_fkey(...)
  `)
```
**The `badge_id` column is NOT being selected!**

2. **Modal doesn't render badge:** Looking at `AdminGiftModal.tsx`, there's NO rendering logic for badges at all. The `GiftData` interface doesn't include `badge_id` or badge details.

3. **Types missing badge:** The `GiftData` interface in `AdminGiftModal.tsx:14-25` doesn't include badge fields.

---

### Bug 4: Badge Names Show "name" - Root Cause

**Location:** `BadgeSelector.tsx:150, 160`

**Root Cause:** The name extraction logic is correct but may fail for certain `name_key` formats.

```typescript
// BadgeSelector.tsx:150
alt={badge.name_key.split('.').pop()?.replace(/_/g, ' ') || 'Badge'}

// BadgeSelector.tsx:160
<p className="font-medium text-sm truncate">
  {badge.name_key.split('.').pop()?.replace(/_/g, ' ')}
</p>
```

**Potential Issues:**
1. If `name_key` doesn't contain a `.`, `split('.').pop()` returns the entire key
2. If `name_key` is just `"name"` in the database, that's what shows
3. The `collectible_items` table might have incorrect `name_key` values

**Verification Needed:** Check actual `name_key` values in the `collectible_items` table.

---

### Feature Request: XP/Coins Before/After

**Current State:** The modal only shows the gift rewards (+XP, +Coins), NOT the user's current balance.

**Implementation Required:**
1. Pass current XP/coins to modal (from `profile.total_xp`, `profile.total_coins`)
2. Display "Current: X" before claiming
3. After claim, show "New Total: Y" with animation

---

## Fix Strategy

### Fix 1: Gift Modal Reappearing

**Approach:** Improve the auto-show effect to properly track dismissed state

**Changes:**
1. Use a local state flag `hasAutoShown` to prevent re-triggering within session
2. Ensure profile is refreshed BEFORE the effect can re-run
3. Add gift ID tracking to prevent showing the same gift twice

**Files to Modify:**
- `components/Header.tsx` - Add hasAutoShown ref, improve effect logic

### Fix 2: New Gift Not Auto-Showing

**Approach:** Reset dismissal when new unclaimed gifts arrive

**Options:**
- **Option A:** Reset `gift_modal_dismissed_at` to NULL when admin sends new gift
- **Option B:** Compare gift creation date with dismissal date (only auto-show gifts created AFTER dismissal)

**Recommended:** Option B (tracks intent better)

**Changes:**
1. Modify auto-show logic to compare timestamps
2. Only block auto-show if `gift_modal_dismissed_at > most_recent_unclaimed_gift.created_at`

**Files to Modify:**
- `components/Header.tsx` - Update effect logic

### Fix 3: Badge Not Showing in Modal

**Approach:** Fetch and display badge information

**Changes:**
1. Add `badge_id` to API select query
2. Join with `collectible_items` to get badge details
3. Add badge to `GiftData` interface
4. Render badge in modal UI with rarity styling

**Files to Modify:**
- `app/api/player/gifts/route.ts` - Add badge to select
- `components/gift/AdminGiftModal.tsx` - Add badge UI
- `hooks/useUnclaimedGifts.ts` - Update interface

### Fix 4: Badge Names

**Approach:** Verify database values and add fallback

**Changes:**
1. Query `collectible_items` table to check actual `name_key` values
2. Add translation lookup using `t(name_key)` with fallback
3. Improve name extraction logic

**Files to Modify:**
- `components/admin/gift/BadgeSelector.tsx` - Add translation lookup

### Fix 5: XP/Coins Before/After Display

**Approach:** Add balance display to modal

**Changes:**
1. Pass `currentXp` and `currentCoins` props to `AdminGiftModal`
2. Display current balance before claiming
3. Show animated "New Total" after claim success

**Files to Modify:**
- `components/gift/AdminGiftModal.tsx` - Add balance UI
- `components/Header.tsx` - Pass balance props

---

## Implementation Steps

### Phase 1: Critical Bug Fixes (Priority: High)

1. **Fix gift modal reappearing (Bug 1)**
   - Add `hasAutoShownRef` to track within session
   - Prevent effect from re-triggering on same gifts

2. **Fix badge not showing (Bug 3)**
   - Update API to fetch badge data
   - Add badge rendering to modal

### Phase 2: UX Improvements (Priority: Medium)

3. **Fix new gift not auto-showing (Bug 2)**
   - Compare timestamps to allow auto-show for new gifts

4. **Fix badge names (Bug 4)**
   - Verify and fix `name_key` values
   - Add translation lookup

### Phase 3: Feature Enhancement (Priority: Low)

5. **Add XP/Coins before/after display**
   - Add balance props to modal
   - Implement before/after UI

---

## Testing Strategy

### Unit Tests
- Test auto-show logic with various dismissal states
- Test badge rendering with/without badge attached
- Test name extraction for various `name_key` formats

### Integration Tests
- Test full gift claim flow
- Test dismissal persistence
- Test new gift arrival after dismissal

### Manual Testing
- Send gift with badge from admin
- Claim gift and verify badge awarded
- Dismiss modal, send new gift, verify auto-show

---

## Prevention Measures

1. **Add comprehensive tests** for gift modal state management
2. **Add type safety** for badge-related interfaces
3. **Document** the gift system flow in codebase
4. **Add monitoring** for gift claim failures

---

## Next Steps

1. Run `/bug_fix:implement-fix` with this RCA
2. Implement fixes in priority order
3. Run tests after each fix
4. Verify all bugs are resolved

---

**RCA Status:** Analysis Complete - Ready for Implementation
