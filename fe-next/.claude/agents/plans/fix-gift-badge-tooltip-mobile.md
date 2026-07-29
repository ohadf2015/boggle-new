# Fix Plan: Gift Badge Display & Mobile Tooltip Issues

## Root Cause

### Bug 1: Badge Not Showing
The code implementation is correct across all layers (API, types, UI). The issue is likely:
- No gifts with badges have been created (data verification needed)
- OR RLS policies might be blocking the collectible_items join

### Bug 2: Tooltip Not Working on Mobile
Radix UI Tooltip uses hover-based interactions which don't work on touch devices.
The project has a working pattern in `AchievementBadge.tsx` that needs to be extracted into a reusable component.

## Fix Strategy

1. **Create MobileTooltip component** - Extract the working pattern from AchievementBadge into a reusable component
2. **Fix CollectionGrid** - Update to use the new MobileTooltip component
3. **Add Tests** - Add comprehensive tests for badge display in AdminGiftModal and mobile tooltip behavior

## Files to Modify

- `components/ui/MobileTooltip.tsx` - NEW: Create reusable mobile-friendly tooltip
- `components/CollectionGrid.tsx` - Update to use MobileTooltip
- `components/gift/__tests__/AdminGiftModal.test.tsx` - Add badge display tests
- `components/ui/__tests__/MobileTooltip.test.tsx` - NEW: Tests for mobile tooltip

## Implementation Steps

1. Create `MobileTooltip.tsx` component with touch support
2. Update `CollectionGrid.tsx` to use `MobileTooltip`
3. Add badge display tests to `AdminGiftModal.test.tsx`
4. Create `MobileTooltip.test.tsx` with touch/click tests
5. Run tests and lint

## Testing Strategy

- Unit tests for MobileTooltip open/close on click
- Unit tests for MobileTooltip close on outside click
- Unit tests for badge rendering in AdminGiftModal
- Integration tests for tooltip behavior on touch devices

## Validation

- `npm run test` - All tests pass
- `npm run lint` - No lint errors
- `npm run build` - Build succeeds
