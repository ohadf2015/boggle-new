# UI Issues - Quick Fix Guide

**Total Issues:** 4 (1 High, 2 Medium, 1 Low)
**Estimated Fix Time:** 1.5 hours total

---

## Issue #1: Footer Links Below Viewport in Landscape (HIGH)

**File:** `/Users/ohadfisher/git/boggle-new/fe-next/components/landing/LandingView.tsx`
**Lines:** 31-76
**Time:** 30 min

### The Problem
Footer links (How to Play, Leaderboard, etc.) extend below viewport in landscape mode on mobile devices.

### Quick Fix Option A (Hide Footer in Landscape)
```typescript
// Line 31 - Add footer suppression
if (isLandscape) {
  return (
    <>
      <main className="flex h-screen w-full items-center justify-center bg-slate-900 p-4 gap-4" role="main">
        {/* Existing landscape content */}
        <Link href={`/${language}/singleplayer`} className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-br from-neo-cyan to-cyan-400 border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all h-full max-h-[80vh]">
          <FaUser className="text-4xl text-neo-black" aria-hidden="true" />
          <span className="text-lg font-black uppercase text-neo-black">{t('landing.singlePlayer')}</span>
          {/* ... rest of content ... */}
        </Link>

        <Link href={`/${language}/multiplayer`} className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-br from-neo-pink to-pink-400 border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all h-full max-h-[80vh]">
          <FaUsers className="text-4xl text-neo-black" aria-hidden="true" />
          <span className="text-lg font-black uppercase text-neo-black">{t('landing.multiplayer')}</span>
          {/* ... rest of content ... */}
        </Link>

        <Link href={`/${language}/rules`} className="absolute bottom-2 right-2 flex items-center gap-1 px-3 py-2 bg-neo-yellow text-neo-black font-bold text-sm border-2 border-neo-black rounded-neo min-h-[44px]">
          <FaQuestionCircle aria-hidden="true" />
          <span className="hidden sm:inline">{t('joinView.howToPlay')}</span>
        </Link>
      </main>
      {/* Don't render Footer or other elements that extend below viewport */}
    </>
  );
}

// Continue with normal portrait layout below...
```

### Test
```bash
# Test at landscape sizes
npx playwright test -g "Landscape Mode"
```

---

## Issue #2A: Skip Link Too Small (LOW)

**File:** `/Users/ohadfisher/git/boggle-new/fe-next/components/Header.tsx`
**Time:** 15 min

### The Problem
Skip to main content link is 1x1px, needs to be 44x44px when focused.

### Quick Fix
```typescript
// In Header.tsx, add before main header content:
<a
  href="#main-content"
  className="skip-to-main-link"
>
  Skip to main content
</a>
```

### In globals.css, add:
```css
.skip-to-main-link {
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: 9999;
  padding: 0.75rem 1.25rem; /* 44x44 minimum */
  background: var(--neo-yellow);
  color: var(--neo-black);
  border: 3px solid var(--neo-black);
  border-radius: 4px;
  font-weight: bold;
  text-decoration: none;
  box-shadow: 4px 4px 0px black;
}

.skip-to-main-link:focus {
  left: 1rem;
  top: 1rem;
  outline: 3px solid var(--neo-cyan);
  outline-offset: 2px;
}
```

### Test
```bash
# Tab to skip link and verify size
npx playwright test -g "Focus States"
```

---

## Issue #2B: Unknown Element 32x32px (MEDIUM)

**File:** TBD (need to identify)
**Time:** 20 min (including identification)

### Find the Element
```bash
cd /Users/ohadfisher/git/boggle-new/fe-next
grep -r "w-8 h-8" components/ | grep -v test | grep -v node_modules
```

### Likely Candidates
1. Settings gear icon in header
2. Avatar icons
3. Small social media buttons

### Generic Fix
```typescript
// Change from:
<button className="w-8 h-8 ...">
  <Icon />
</button>

// To (44px = w-11 h-11 in Tailwind):
<button className="w-11 h-11 flex items-center justify-center ...">
  <Icon className="w-6 h-6" />
</button>
```

### Test
```bash
npx playwright test -g "Touch Target"
```

---

## Issue #3: Text Overflow on 320px (MEDIUM)

**Files:**
- `/Users/ohadfisher/git/boggle-new/fe-next/app/globals.css`
- `/Users/ohadfisher/git/boggle-new/fe-next/components/landing/LandingView.tsx`
**Time:** 25 min

### Fix Part 1: Fluid Typography (globals.css)
```css
/* Add to globals.css */
h1 {
  font-size: clamp(1.5rem, 5vw + 0.5rem, 3rem);
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.text-responsive {
  font-size: clamp(0.875rem, 2vw + 0.5rem, 1rem);
  word-wrap: break-word;
}
```

### Fix Part 2: Badge Icons on Small Screens (LandingView.tsx)
```typescript
// Lines 46-48 and 60-62 - Update badge spans:

// Change from:
<div className="flex gap-2 text-xs" aria-hidden="true">
  <span className="bg-neo-black/20 px-2 py-1 rounded-neo font-bold">
    <FaRobot className="inline mr-1" />Bots
  </span>
  <span className="bg-neo-black/20 px-2 py-1 rounded-neo font-bold">
    <FaTrophy className="inline mr-1" />Challenges
  </span>
</div>

// To (hide text on smallest screens, show icon only):
<div className="flex gap-1 sm:gap-2 text-xs" aria-hidden="true">
  <span
    className="bg-neo-black/20 px-1.5 sm:px-2 py-1 rounded-neo font-bold"
    title="Bots"
  >
    <FaRobot className="inline" />
    <span className="hidden xs:inline ml-1">Bots</span>
  </span>
  <span
    className="bg-neo-black/20 px-1.5 sm:px-2 py-1 rounded-neo font-bold"
    title="Challenges"
  >
    <FaTrophy className="inline" />
    <span className="hidden xs:inline ml-1">Challenges</span>
  </span>
</div>
```

### Test
```bash
npx playwright test -g "iPhone SE"
npx playwright test -g "Long text"
```

---

## Complete Fix Checklist

```bash
# 1. Fix footer in landscape (HIGH)
# Edit: components/landing/LandingView.tsx (lines 31-76)
# Time: 30 min

# 2. Fix skip link (LOW)
# Edit: components/Header.tsx + app/globals.css
# Time: 15 min

# 3. Find and fix 32x32 element (MEDIUM)
# Search: grep -r "w-8 h-8" components/
# Edit: Identified file
# Time: 20 min

# 4. Fix text overflow (MEDIUM)
# Edit: app/globals.css + components/landing/LandingView.tsx
# Time: 25 min

# Total: ~90 minutes
```

---

## Verify All Fixes

```bash
# Run full test suite
cd /Users/ohadfisher/git/boggle-new/fe-next
npx playwright test comprehensive-ui-test.spec.ts

# Should see: 54/54 tests passed, 0 warnings
```

---

## Manual Testing Checklist

After automated tests pass, manually verify:

- [ ] On iPhone SE (320px), text doesn't overflow
- [ ] In landscape mode, footer links don't cause scroll issues
- [ ] Tab to skip link, verify it's 44x44px when focused
- [ ] All buttons/links are at least 44x44px
- [ ] Test on real device if possible (not just emulator)

---

## Priority Order

1. **First (30 min):** Fix landscape footer issue
   - Highest impact on user experience
   - Affects all mobile landscape usage

2. **Second (20 min):** Find and fix 32x32px element
   - Accessibility compliance
   - Affects mobile users

3. **Third (25 min):** Fix text overflow on 320px
   - Affects smallest device segment
   - Visual polish

4. **Fourth (15 min):** Fix skip link
   - Low impact (keyboard users only)
   - Quick win for accessibility

---

## Need Help?

### Common Issues

**"I can't find the 32x32px element"**
```bash
# Try these searches:
grep -rn "w-8 h-8" components/
grep -rn "width: 32px" components/
grep -rn "32px" components/ | grep -i icon

# Or use browser dev tools:
# 1. Open http://localhost:3001/en
# 2. Right-click > Inspect
# 3. Click "Select element" tool
# 4. Click small icons/buttons
# 5. Check computed dimensions
```

**"Tests still failing after fixes"**
```bash
# Clear test cache
rm -rf test-results/
rm -rf playwright-report/

# Re-run tests
npx playwright test comprehensive-ui-test.spec.ts
```

**"Need to see what changed"**
```bash
# Compare screenshots before/after
# Old: test-results/[test-name].png
# New: (regenerated after fixes)
```

---

## Success Criteria

After all fixes:
- ✅ All 54 tests pass
- ✅ 0 console warnings
- ✅ All touch targets ≥ 44x44px
- ✅ No text overflow on 320px
- ✅ Footer accessible in landscape
- ✅ Skip link focusable at proper size

**Then you're ready for production!**
