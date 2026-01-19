# Root Cause Analysis: Gift Badge Display & Tooltip Mobile Issues

**Date:** 2026-01-19
**Issue:** Two related bugs in admin gift system
**Severity:** Medium
**Status:** Analysis Complete

---

## Issue Summary

### Bug 1: Badge Not Showing in Gift Modal
**Description:** When an admin sends a gift with an attached badge, the badge is not displayed in the gift modal UI.

**Expected Behavior:**
- Gift modal should display the attached badge with icon/image, name, and rarity styling
- Badge section should appear between rewards and claim button

**Actual Behavior:**
- Badge is not visible in the modal even when `badge_id` is set and data is fetched

### Bug 2: Tooltip Not Working on Mobile for Badge
**Description:** Tooltips on badges don't work on mobile/touch devices.

**Expected Behavior:**
- Tapping a badge on mobile should show its tooltip
- Tapping outside should dismiss the tooltip

**Actual Behavior:**
- Tooltips don't appear on touch/tap interactions

---

## Root Cause Analysis

### Bug 1: Badge Not Showing - Root Cause

**Finding:** After thorough code analysis, the badge IS correctly implemented in both:

1. **API Layer (`app/api/player/gifts/route.ts:60, 88-93`):**
   ```typescript
   .select(`
     ...
     badge:collectible_items!admin_gift_messages_badge_id_fkey(id, name_key, icon, image_url, rarity),
     ...
   `)

   // Transform badge from array to single object
   let badge: BadgeInfo | null = null;
   if (Array.isArray(gift.badge) && gift.badge.length > 0) {
     badge = gift.badge[0] as BadgeInfo;
   } else if (gift.badge && !Array.isArray(gift.badge)) {
     badge = gift.badge as BadgeInfo;
   }
   ```

2. **UI Layer (`components/gift/AdminGiftModal.tsx:424-469`):**
   ```typescript
   {gift.badge && (
     <motion.div className="gift-badge mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
       {/* Badge icon/image and name with rarity styling */}
     </motion.div>
   )}
   ```

3. **Types (`hooks/useUnclaimedGifts.ts:6-12, 21-22`):**
   ```typescript
   interface BadgeInfo {
     id: string;
     name_key: string;
     icon: string;
     image_url: string | null;
     rarity: string;
   }

   interface GiftMessage {
     badge_id?: string | null;
     badge?: BadgeInfo | null;
     // ...
   }
   ```

**Possible Root Causes (Need Verification):**

1. **Admin Not Setting Badge:** The admin gift creation flow might not be attaching `badge_id` to the gift
2. **Badge FK Constraint:** The `collectible_items` table might not have the referenced badge
3. **Supabase Join Issue:** The FK join might be failing silently if RLS policies block access

**Verification Steps:**
1. Check Supabase `admin_gift_messages` table for gifts with `badge_id` set
2. Verify the referenced badges exist in `collectible_items` table
3. Check RLS policies on `collectible_items` table

---

### Bug 2: Tooltip Not Working on Mobile - Root Cause

**Location:** `components/ui/tooltip.tsx` (uses Radix UI Tooltip)

**Root Cause:** Radix UI's default `Tooltip` component uses hover-based interactions (`onPointerEnter`/`onPointerLeave`) which don't translate well to touch devices. Touch devices simulate hover on first tap, but the tooltip closes immediately when the tap ends.

**Evidence:**

The project has TWO tooltip patterns:

1. **Broken Pattern (Radix default):** Used in `CollectionGrid.tsx:124-179`
   ```typescript
   <Tooltip>
     <TooltipTrigger asChild>
       <motion.div ...>
     </TooltipTrigger>
     <TooltipContent>...</TooltipContent>
   </Tooltip>
   ```
   - No touch handling
   - Relies on hover which doesn't work on mobile

2. **Working Pattern:** Used in `AchievementBadge.tsx:61-78, 99-101, 152-157`
   ```typescript
   const [open, setOpen] = useState(false);
   const isTouchDevice = useRef(false);

   const handleTouchStart = () => {
     isTouchDevice.current = true;
   };

   const handleClick = (e: React.MouseEvent) => {
     e.preventDefault();
     e.stopPropagation();
     setOpen(!open);
   };

   const handleOpenChange = (newOpen: boolean) => {
     // On touch devices, ignore Radix's automatic open/close
     if (isTouchDevice.current) return;
     setOpen(newOpen);
   };

   <TooltipProvider delayDuration={0}>
     <Tooltip open={open} onOpenChange={handleOpenChange}>
       <TooltipTrigger asChild onClick={handleClick} onTouchStart={handleTouchStart}>
         ...
       </TooltipTrigger>
       <TooltipContent onPointerDownOutside={() => setOpen(false)}>
         ...
       </TooltipContent>
     </Tooltip>
   </TooltipProvider>
   ```
   - Manually controlled open state
   - Touch detection via `onTouchStart`
   - Click toggle for touch devices
   - `onPointerDownOutside` to dismiss

**The AdminGiftModal badge section does NOT use any tooltip** - it just displays the badge directly. If tooltips are needed on the badge in the modal, they need to be added with the working pattern.

---

## Fix Strategy

### Fix 1: Verify Badge Data Flow

**Approach:** Debug the data flow to identify where badge data is lost

**Steps:**
1. Add console logging to API response to verify badge is included
2. Check admin gift creation flow to ensure `badge_id` is being saved
3. Verify Supabase RLS allows reading from `collectible_items`

**Files to Check:**
- `app/api/player/gifts/route.ts` - Add logging
- Admin gift creation API - Verify badge_id is saved
- Supabase RLS policies for `collectible_items`

### Fix 2: Add Mobile-Friendly Tooltip to Badge

**Approach:** If tooltip is needed on the badge in the modal, implement the working pattern

**Changes:**
1. Add `useState` for open state
2. Add `useRef` for touch device detection
3. Add click/touch handlers
4. Use controlled `Tooltip` with `onPointerDownOutside`

**Files to Modify:**
- `components/gift/AdminGiftModal.tsx` - Add tooltip to badge section

### Fix 3: Create Reusable Mobile-Friendly Tooltip Wrapper

**Approach:** Create a wrapper component that handles mobile touch properly

**Pattern:**
```typescript
// components/ui/MobileTooltip.tsx
export function MobileTooltip({ children, content, ...props }) {
  const [open, setOpen] = useState(false);
  const isTouchDevice = useRef(false);

  // ... handlers

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip open={open} onOpenChange={handleOpenChange}>
        <TooltipTrigger asChild onClick={handleClick} onTouchStart={handleTouchStart}>
          {children}
        </TooltipTrigger>
        <TooltipContent onPointerDownOutside={() => setOpen(false)}>
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

---

## Testing Strategy

### Unit Tests
- Test badge rendering when `gift.badge` is present
- Test badge rendering when `gift.badge` is null/undefined
- Test tooltip open/close on click
- Test tooltip close on outside click

### Integration Tests
- Test full gift flow with badge attached
- Test gift modal displays badge correctly

### Manual Testing
1. Create a gift with badge attached via admin
2. Verify badge shows in recipient's gift modal
3. Test on mobile device - tap badge, verify tooltip appears
4. Tap outside, verify tooltip closes

---

## Impact

**Current Impact:**
- Users don't see badges they received with gifts
- Mobile users can't see badge/collectible tooltips

**Potential Side Effects:**
- None expected if following existing patterns

---

## Prevention Measures

1. **Add comprehensive tests** for badge display in AdminGiftModal
2. **Create MobileTooltip wrapper** component to standardize mobile tooltip handling
3. **Document tooltip patterns** in component library docs
4. **Add E2E test** for gift with badge flow

---

## Next Steps

1. **Immediate:** Verify badge data is being saved and returned by checking Supabase directly
2. **If badge data exists:** Debug why it's not rendering (check for typos in prop names, etc.)
3. **If badge data doesn't exist:** Fix admin gift creation to save badge_id
4. **For tooltip:** Implement mobile-friendly pattern if tooltip is needed

---

**RCA Status:** Analysis Complete - Ready for Implementation

**Run:** `/bug_fix:implement-fix .claude/agents/reviews/rca-gift-badge-tooltip-mobile.md`
