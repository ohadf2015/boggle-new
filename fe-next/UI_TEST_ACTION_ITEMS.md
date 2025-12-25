# LexiClash - UI Test Action Items

## High Priority (Fix Before Launch)

### 1. Fix Onboarding Modal UX Friction
**Issue:** Modal blocks all interactions with landing page until dismissed
**Time:** 2 hours
**Files:**
- `/Users/ohadfisher/git/boggle-new/fe-next/components/OnboardingModal.tsx`
- `/Users/ohadfisher/git/boggle-new/fe-next/utils/onboardingStorage.ts`

**Tasks:**
- [ ] Verify ESC key dismisses modal
- [ ] Verify X button works correctly
- [ ] Test localStorage persistence (modal doesn't re-show after completion)
- [ ] Add `?skipOnboarding=true` query parameter for testing
- [ ] Consider delaying modal until after first page interaction

**Code Reference:**
```typescript
// Add to onboarding modal:
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, []);

// Skip in test mode:
const skipOnboarding = new URLSearchParams(window.location.search).get('skipOnboarding');
if (skipOnboarding === 'true') return null;
```

---

### 2. Add Accessibility Labels to Icon Buttons
**Issue:** Settings button lacks aria-label (WCAG violation)
**Time:** 30 minutes
**Files:**
- Header component with settings button

**Tasks:**
- [ ] Find icon-only button (likely settings gear icon)
- [ ] Add `aria-label="Settings"` to button
- [ ] Add `aria-hidden="true"` to icon SVG
- [ ] Verify with screen reader (VoiceOver or NVDA)

**Code Reference:**
```tsx
// Before:
<button onClick={openSettings}>
  <SettingsIcon />
</button>

// After:
<button onClick={openSettings} aria-label="Settings">
  <SettingsIcon aria-hidden="true" />
</button>
```

---

### 3. Fix Animation Stability Issues
**Issue:** Modal animations cause "element not stable" errors
**Time:** 2 hours
**Files:**
- Dialog/modal components
- Animation CSS classes

**Tasks:**
- [ ] Review animation duration (consider reducing from 200ms to 150ms)
- [ ] Add `pointer-events: none` during animations
- [ ] Use `animationend` event to enable interactions
- [ ] Test with Playwright to verify fix

**Code Reference:**
```typescript
const [isAnimating, setIsAnimating] = useState(false);

const handleOpen = () => {
  setIsAnimating(true);
  setIsOpen(true);
};

// In component:
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.15 }}
  onAnimationComplete={() => setIsAnimating(false)}
  style={{ pointerEvents: isAnimating ? 'none' : 'auto' }}
>
  {children}
</motion.div>
```

---

## Medium Priority (Fix This Week)

### 4. Fix Multiple H1 Elements
**Issue:** Page has 2 H1 elements (SEO/accessibility best practice)
**Time:** 30 minutes
**Files:**
- Landing page component
- Header component

**Tasks:**
- [ ] Identify both H1 elements
- [ ] Keep main page title as H1
- [ ] Change secondary H1 to H2
- [ ] Verify heading hierarchy with DevTools

---

### 5. Improve Focus Ring Visibility
**Issue:** Focus indicators need better visibility/contrast
**Time:** 1 hour
**Files:**
- Global CSS or Tailwind config
- Component styles

**Tasks:**
- [ ] Create custom focus ring style matching neo-brutalist theme
- [ ] Ensure 3:1 contrast ratio with background
- [ ] Test keyboard navigation through all interactive elements
- [ ] Consider using thick colored outline (3px) instead of default ring

**Code Reference:**
```css
/* In global CSS or Tailwind: */
*:focus-visible {
  outline: 3px solid var(--neo-yellow);
  outline-offset: 2px;
  box-shadow: 0 0 0 6px rgba(255, 225, 53, 0.3);
}
```

---

### 6. Add Loading State Indicators
**Issue:** No visible loading states for async operations
**Time:** 2 hours
**Files:**
- Room creation flow
- Room joining flow
- Available rooms fetching

**Tasks:**
- [ ] Add loading spinner for "Create Room" button
- [ ] Add skeleton screen for room list while loading
- [ ] Add loading state for form submission
- [ ] Design neo-brutalist spinner/loader

**Code Reference:**
```tsx
// Neo-brutalist spinner:
<div className="inline-block w-8 h-8 border-4 border-neo-black border-t-neo-yellow rounded-full animate-spin" />
```

---

### 7. Test and Verify Error Messages
**Issue:** Cannot verify error states due to test failures
**Time:** 1 hour
**Manual Testing Required**

**Tasks:**
- [ ] Test invalid room code entry
- [ ] Test network error scenarios
- [ ] Verify error messages are clear and actionable
- [ ] Check aria-live regions announce errors to screen readers
- [ ] Verify error styling (color, positioning)

**Scenarios to Test:**
1. Enter invalid room code "INVALID123"
2. Try to join room that doesn't exist
3. Try to create room with empty name
4. Disconnect network and try to join room
5. Test rate limiting (too many requests)

---

## Low Priority (Nice to Have)

### 8. Improve Placeholder Text
**Issue:** "Enter your..." is truncated and unclear
**Time:** 15 minutes
**Files:**
- Multiplayer page form inputs

**Tasks:**
- [ ] Change "Enter your..." to "Enter your name"
- [ ] Verify in all 5 languages (translation keys)

---

### 9. Add Tooltips to Icon Buttons
**Issue:** Icon buttons lack hover explanations
**Time:** 1 hour
**Files:**
- Room code copy button
- Refresh button
- Settings button

**Tasks:**
- [ ] Add tooltip component or use existing library
- [ ] Add "Click to copy" tooltip to room code icon
- [ ] Add "Refresh rooms" tooltip to refresh button
- [ ] Add "Settings" tooltip to gear icon
- [ ] Style tooltips to match neo-brutalist design

---

### 10. Add Keyboard Shortcuts to Language Dropdown
**Issue:** Language selection is mouse-only
**Time:** 1 hour
**Files:**
- Language dropdown component

**Tasks:**
- [ ] Add keyboard navigation (arrow keys)
- [ ] Add type-to-select (type "h" for Hebrew)
- [ ] Add aria-label describing current selection
- [ ] Test with keyboard only

---

### 11. Consider Collapsible Mobile Footer
**Issue:** Footer takes vertical space on mobile
**Time:** 2 hours
**Files:**
- Footer component
- Mobile layout

**Tasks:**
- [ ] Design collapsible footer concept
- [ ] Implement expand/collapse functionality
- [ ] Ensure accessibility (keyboard control)
- [ ] Test on various mobile devices

---

## Testing Tasks

### Automated Testing Improvements

**Add Test IDs:**
- [ ] Add `data-testid="single-player-card"`
- [ ] Add `data-testid="multiplayer-card"`
- [ ] Add `data-testid="onboarding-modal"`
- [ ] Add `data-testid="onboarding-close-btn"`
- [ ] Add `data-testid="room-code-input"`
- [ ] Add `data-testid="create-room-btn"`
- [ ] Add `data-testid="join-room-btn"`

**Update Test Script:**
- [ ] Add onboarding modal dismissal to test setup
- [ ] Add wait for animations helper
- [ ] Increase timeout for modal transitions
- [ ] Add retry logic for unstable elements

---

### Manual Testing Checklist

**User Flows:**
- [ ] Complete onboarding flow on first visit
- [ ] Dismiss onboarding with X button
- [ ] Dismiss onboarding with ESC key
- [ ] Create room with all 5 language options
- [ ] Join room with valid code
- [ ] Join room with invalid code
- [ ] Test daily challenge feature
- [ ] Complete full game from start to finish
- [ ] View results page
- [ ] Check leaderboard

**Accessibility:**
- [ ] Test with NVDA screen reader (Windows)
- [ ] Test with VoiceOver screen reader (Mac)
- [ ] Complete full flow using keyboard only (no mouse)
- [ ] Verify all images have alt text
- [ ] Check color contrast with DevTools
- [ ] Test with 200% browser zoom
- [ ] Test with high contrast mode

**Cross-Browser/Device:**
- [ ] Test on iOS Safari (iPhone)
- [ ] Test on Android Chrome (Pixel/Samsung)
- [ ] Test on Firefox
- [ ] Test on Safari (Mac)
- [ ] Test on Edge
- [ ] Test on iPad (tablet)
- [ ] Test RTL layout (Hebrew language)

**Performance:**
- [ ] Run Lighthouse audit
- [ ] Test on slow 3G network
- [ ] Check bundle size
- [ ] Verify lazy loading works
- [ ] Test with disabled JavaScript (graceful degradation)

---

### Lighthouse Audit

**Run Command:**
```bash
npm install -g lighthouse
lighthouse http://localhost:3001 --output html --output-path=./lighthouse-report.html --view
```

**Target Scores:**
- Performance: 90+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 95+

---

## Priority Timeline

**Week 1 (This Week):**
- Day 1: Fix onboarding modal UX (#1)
- Day 1: Add aria-labels (#2)
- Day 2: Fix animation stability (#3)
- Day 3: Fix H1 elements (#4), improve focus rings (#5)
- Day 4: Add loading states (#6)
- Day 5: Manual error testing (#7)

**Week 2 (Next Week):**
- Implement low priority enhancements (#8-11)
- Complete manual testing checklist
- Run cross-browser testing
- Conduct accessibility audit
- Run Lighthouse performance audit

**Week 3 (Before Launch):**
- Fix any issues found in testing
- Final QA pass
- Prepare for production deployment

---

## Success Criteria

**Before marking complete:**
- [ ] All high-priority issues fixed
- [ ] All automated tests passing (24/24)
- [ ] Lighthouse accessibility score 95+
- [ ] Manual testing checklist 100% complete
- [ ] Zero WCAG 2.1 Level A violations
- [ ] Tested on iOS and Android
- [ ] Tested with screen reader
- [ ] Tested with keyboard only
- [ ] Code reviewed by team
- [ ] Deployed to staging for final review

---

## Resources

**Documentation:**
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- Playwright Docs: https://playwright.dev/
- React Accessibility: https://react.dev/learn/accessibility

**Tools:**
- axe DevTools: Browser extension for accessibility testing
- WAVE: https://wave.webaim.org/
- Lighthouse: Built into Chrome DevTools
- NVDA Screen Reader: https://www.nvaccess.org/download/

**Test Files:**
- Comprehensive test: `/Users/ohadfisher/git/boggle-new/fe-next/e2e/comprehensive-ui-test.spec.js`
- Screenshots: `/Users/ohadfisher/git/boggle-new/fe-next/test-screenshots/`
- Reports: `/Users/ohadfisher/git/boggle-new/fe-next/COMPREHENSIVE_UI_TEST_REPORT.md`

---

**Created:** December 25, 2025
**Last Updated:** December 25, 2025
