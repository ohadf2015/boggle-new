# Fix Plan: Mobile Timer and Combo Alignment

## Root Cause
The mobile stats row uses `justify-between` flexbox layout, combined with the score having `flex-1`, which prevents the timer from being truly centered. The score expands to fill available space, pushing the timer toward the left edge.

## Fix Strategy
Restructure the mobile stats row to use absolute positioning for the score, allowing the timer to be truly centered regardless of score width.

## Files to Modify
- `components/game/in-game/components/PortraitLayout.tsx` - Fix mobile layout structure

## Implementation Steps

1. **Modify stats row container:**
   - Change from `justify-between` to `justify-center` on mobile
   - Keep `lg:justify-between` for desktop behavior
   - Add `min-h-[80px]` for consistent vertical space

2. **Position score absolutely on mobile:**
   - Add `absolute right-2 top-1/2 -translate-y-1/2` for mobile
   - Add `lg:relative lg:right-auto lg:top-auto lg:translate-y-0` to reset on desktop
   - Remove `flex-1` from score wrapper on mobile

3. **Ensure combo row has proper spacing:**
   - Already has `h-[40px]` - verify it's working
   - Add data-testid for testing

4. **Add test IDs for verification:**
   - `data-testid="stats-row-mobile"` on the stats row
   - `data-testid="timer-container"` on the timer
   - `data-testid="score-mobile"` on the score

## Testing Strategy
- Unit tests: Verify layout structure with test IDs
- Test timer centering with different score widths
- Test combo row maintains fixed height

## Validation
- Timer should be horizontally centered at all times
- Score should be positioned on the right without affecting timer
- Combo should be centered above timer
- No layout shift when combo appears/disappears
