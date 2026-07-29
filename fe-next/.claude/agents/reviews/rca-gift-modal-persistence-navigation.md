# Root Cause Analysis: Gift Modal Keeps Reappearing After Dismissal

**Date:** 2026-01-21
**Issue:** Gift modal keeps popping up on every new page after player closed them
**Severity:** Medium
**Status:** ✅ FIXED

## Issue Summary

**Description:**
The gift modal keeps appearing on every page navigation after the player has already dismissed it. Additionally, the gift notification badge continues to show in the mobile menu even after dismissal within the same session.

**Expected Behavior:**
When a user dismisses the gift modal (clicks X), it should NOT auto-appear again:
1. On subsequent page navigations within the same session
2. On mobile menu interactions
3. Until a NEW gift arrives (created after the dismissal timestamp)

**Actual Behavior:**
1. User dismisses gift modal by clicking X
2. User navigates to another page
3. After 3 seconds, the modal auto-shows again
4. The gift badge in mobile menu continues to trigger modal shows

**Impact:**
- Affected users: All authenticated users with unclaimed gifts
- Affected features: Gift modal auto-show, mobile navigation UX
- Severity: Medium - Significantly degrades user experience

## Reproduction

**Can Reproduce:** Yes - Consistently reproducible

**Reproduction Steps:**
1. Login as authenticated user with unclaimed gifts
2. Wait for gift modal to auto-show (3 seconds)
3. Click X to dismiss the modal (without claiming)
4. Navigate to any other page in the app
5. Wait 3 seconds
6. **BUG**: Modal auto-shows again

**Environment:**
- Mode: LOCAL / PRODUCTION
- Browser: All browsers
- Data: Any authenticated user with unclaimed gifts

## Analysis

**Related Files:**
- `components/Header.tsx` - Gift modal state management (lines 40-46, 109-155)
- `hooks/useUnclaimedGifts.ts` - Gift data fetching
- `app/api/player/gifts/dismiss-modal/route.ts` - Dismissal persistence API

**Code Flow:**

```
1. Header mounts → useUnclaimedGifts fetches gifts
2. useEffect (line 109-155) runs auto-show logic:
   - Checks if showGiftModal is false
   - Checks if gifts exist
   - Finds "eligible" gift (not claimed, not auto-shown, not dismissed)
   - Starts 3-second timer
   - Shows modal when timer fires

3. User clicks X → handleDismissGiftModal called
   - Adds gift ID to dismissedGiftIdsRef Set
   - Only calls API if NO MORE unclaimed gifts remain

4. User navigates to new page
   - Next.js App Router unmounts Header component
   - autoShownGiftIdsRef and dismissedGiftIdsRef are RESET (new empty Sets)
   - Header remounts with fresh state

5. Auto-show effect runs again
   - dismissedGiftIdsRef is empty (refs were reset)
   - Same gift is now "eligible" again
   - Timer starts → modal appears after 3 seconds
```

## Root Cause

**Root Cause:**
The dismissal tracking uses `useRef<Set<string>>` which resets when the Header component unmounts and remounts during Next.js page navigation. The refs (`autoShownGiftIdsRef` and `dismissedGiftIdsRef`) are session-scoped only within the component lifecycle, not across navigations.

**Why it Happened:**
1. **Component-scoped refs**: `useRef` creates a new ref object on each component mount
2. **Next.js App Router behavior**: Page navigation remounts layout components
3. **Insufficient persistence layer**: Database dismissal is only saved when ALL gifts are dismissed, not per-gift
4. **Missing navigation-safe state**: No sessionStorage/localStorage for dismissed gift IDs within session

**Code Evidence (Header.tsx lines 43-46):**
```typescript
// Track which gift IDs have been auto-shown this session to prevent re-showing
const autoShownGiftIdsRef = useRef<Set<string>>(new Set());
// Track which gift IDs have been dismissed this session (user clicked X without claiming)
// This prevents the gift from re-appearing after 3 second auto-show timer
const dismissedGiftIdsRef = useRef<Set<string>>(new Set());
```

These refs are recreated as empty Sets on every component mount.

## Fix Strategy

**Implemented Fix:**
Persist dismissal to database IMMEDIATELY when ANY gift is dismissed by calling `/api/player/gifts/dismiss-modal`. The DB stores `gift_modal_dismissed_at` timestamp, and the auto-show logic filters gifts by comparing `created_at > dismissed_at`.

**Implementation:**

### Modified `handleDismissGiftModal` in Header.tsx:

```typescript
const handleDismissGiftModal = useCallback(async () => {
  // Mark current gift as dismissed in ref for immediate effect within this session
  if (selectedGift?.id) {
    dismissedGiftIdsRef.current.add(selectedGift.id);
  }

  // Persist dismissal to database IMMEDIATELY (fire-and-forget)
  // This updates gift_modal_dismissed_at so gifts created before this timestamp
  // won't auto-show again in future sessions or after navigation
  fetch('/api/player/gifts/dismiss-modal', {
    method: 'POST',
  }).then(() => {
    // Refresh profile to get updated gift_modal_dismissed_at
    refreshProfile();
  }).catch(error => {
    console.error('Failed to persist gift modal dismissal:', error);
    // Non-critical error - don't block user experience
  });

  // ... rest of existing logic to show next gift or close modal
}, [gifts, selectedGift, refreshProfile]);
```

**Key Changes:**
1. Call dismiss-modal API IMMEDIATELY on every dismissal (not just when all gifts are dismissed)
2. Refresh profile after successful API call to get updated `gift_modal_dismissed_at` timestamp
3. Auto-show logic already filters gifts by `created_at > gift_modal_dismissed_at`

**Files Modified:**
- `components/Header.tsx` - Updated handleDismissGiftModal to call API immediately

**Tests Added:**
- `components/__tests__/Header.giftModalNavigation.test.tsx` - 5 tests covering:
  - API called IMMEDIATELY on dismissal
  - Profile refreshed after successful API call
  - Gifts created BEFORE dismissal timestamp are NOT auto-shown
  - Gifts created AFTER dismissal timestamp ARE auto-shown
  - Gift badge still shows in header (users can manually open to view gifts)

## Impact

**After Fix:**
- Users affected: None (bug fixed)
- Features working: Gift modal respects dismissal across page navigations
- Data impact: `gift_modal_dismissed_at` timestamp updated on each dismissal

## Prevention

**Implemented:**
- [x] Add test: Navigation persistence test for dismissed gift IDs
- [x] Use database persistence for cross-navigation/cross-session state
- [x] Fire-and-forget pattern for non-blocking dismissal persistence

---

**RCA Status:** ✅ FIXED AND VERIFIED
