# UI ISSUES - QUICK FIX GUIDE

## CRITICAL FIXES (Do First)

### 1. Skip Link Positioning - ACCESSIBILITY VIOLATION
**File:** Layout component (likely `/fe-next/app/[locale]/layout.tsx`)
**Issue:** Skip link positioned at x:-1 (off-screen)
**Fix:**
```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2"
>
  Skip to main content
</a>
```

## HIGH PRIORITY FIXES

### 2. Footer Cut Off on Mobile
**File:** `/fe-next/components/Footer.tsx` (Lines 20-109)
**Issues:**
- Footer extends beyond viewport on mobile portrait
- Links positioned too low (y > viewport height)

**Fixes:**
```tsx
// Reduce padding on mobile
className="py-4 md:py-6 px-4 mt-auto"

// Ensure footer visible
// Add to container:
className="fixed bottom-0 left-0 right-0 md:relative"
// OR reduce content height above footer
```

### 3. Touch Target Sizes
**Affected Files:** Multiple components

**Tutorial Step Indicators:**
```tsx
// Current: 26-28px width
// Fix: Add more padding
className="min-w-[48px] min-h-[48px] px-4"
```

**Close Buttons:**
```tsx
// Current: 36-40px
// Fix:
className="w-12 h-12" // 48x48px
```

**Footer Links:**
```tsx
// Already has min-h-[44px] but not working
// Ensure display flex:
className="min-h-[48px] px-3 flex items-center justify-center"
```

### 4. Header Element Overlaps
**File:** `/fe-next/components/Header.tsx` (Lines 87-200+)
**Issue:** Language selector overlapping Sign In button and other elements

**Fix:**
```tsx
// Increase gap between header elements
className="flex items-center gap-3 md:gap-4 lg:gap-6"

// Add margin to language selector
className="mr-4 md:mr-6"
```

## MEDIUM PRIORITY FIXES

### 5. Text Size Issues
**File:** `/fe-next/app/[locale]/singleplayer/page.tsx`

**Small descriptions (currently 9px):**
```tsx
// Increase to 14px minimum
className="text-sm md:text-base" // 14px / 16px
```

**Player count (currently 8px):**
```tsx
// Increase or use icons
className="text-xs" // 12px minimum
```

### 6. Content Overflow
**Files:** Single Player, Multiplayer, Rules pages

**Add scrollable containers:**
```tsx
<main className="overflow-y-auto max-h-[calc(100vh-200px)]">
  {/* content */}
</main>
```

### 7. Button Overlaps in Landscape
**Files:** Multiplayer, Leaderboard pages

**Increase spacing:**
```tsx
// In button containers
className="flex gap-6 md:gap-8 flex-wrap"
```

## RTL-SPECIFIC FIXES

### 8. Hebrew Skip Link
**File:** Layout component
**Issue:** Positioned at x:375, x:667 (outside right edge)

**Fix:**
```tsx
// Use RTL-aware positioning
className="[dir=rtl]:right-0 [dir=ltr]:left-0"
```

### 9. Hebrew Footer
**File:** Footer.tsx
**Issue:** Links extend beyond viewport

**Fix:**
```tsx
// Test with Hebrew and ensure proper RTL spacing
className="gap-2 [dir=rtl]:gap-x-reverse"
```

## QUICK WINS (Easy Fixes)

1. **Increase all `min-h-[44px]` to `min-h-[48px]`**
2. **Add `gap-4` to all flex containers with buttons**
3. **Change all `text-xs` to `text-sm` on mobile**
4. **Add `overflow-y-auto` to main content areas**
5. **Reduce `py-6` to `py-4` on mobile for footers**

## FILES TO MODIFY (Priority Order)

1. `/fe-next/app/[locale]/layout.tsx` - Skip link fix
2. `/fe-next/components/Footer.tsx` - Footer positioning & touch targets
3. `/fe-next/components/Header.tsx` - Element overlaps
4. `/fe-next/app/[locale]/singleplayer/page.tsx` - Text sizes & overflow
5. `/fe-next/app/[locale]/multiplayer/page.tsx` - Back button & overlaps
6. `/fe-next/app/[locale]/rules/page.tsx` - Tab navigation & overflow
7. `/fe-next/components/landing/TutorialOverlay.tsx` - Step indicators
8. `/fe-next/components/Modal.tsx` - Close button size

## TESTING CHECKLIST

After each fix:
- [ ] Test on mobile 375px portrait
- [ ] Test on mobile 375px landscape
- [ ] Test on tablet 768px
- [ ] Test on desktop 1920px
- [ ] Test Hebrew (RTL) version
- [ ] Test with keyboard navigation
- [ ] Run automated test: `node ui-test.js`

## VERIFICATION

Run comprehensive test again:
```bash
node ui-test.js
```

Expected reduction in issues:
- Skip link fixes: -72 issues
- Footer fixes: -100+ issues
- Touch targets: -218 issues
- Overlaps: -106 issues
- **Total reduction: ~500 issues (60% improvement)**
