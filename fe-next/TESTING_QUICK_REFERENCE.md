# Testing Quick Reference Card

## How to Verify Each Feature

### 1. Responsive Grid Layout
**Where:** `/[locale]/singleplayer`

**Steps:**
1. Open browser dev tools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test viewports:
   - iPhone SE (375x667) → Should see **2 columns**
   - iPad (768x1024) → Should see **3 columns**
4. Click any game mode (Solo/Challenge/Battle)
5. Observe preset difficulty cards
6. Resize window → Grid should adapt smoothly

**Expected:**
```
Mobile (< 640px):     Tablet (640px+):
┌───┐ ┌───┐          ┌───┐ ┌───┐ ┌───┐
│ 1 │ │ 2 │          │ 1 │ │ 2 │ │ 3 │
└───┘ └───┘          └───┘ └───┘ └───┘
```

**File:** `components/singleplayer/PresetSelector.tsx:346,501`

---

### 2. Language Completion Indicators
**Where:** `/[locale]/daily`

**Steps:**
1. Go to daily challenge page
2. Look for language selector button (top right)
3. **If fresh:** Should see NO badge
4. **If 1+ completed:** Should see green circle with number
5. Click language selector button
6. Dropdown opens showing all 5 languages
7. Completed languages show green checkmark (✓)

**Expected:**
```
Button:  [🇺🇸 🌐 ▼] ①  ← Green badge showing count

Dropdown:
  🇺🇸 English     ✓  ← Green check
  🇮🇱 עברית
  🇸🇪 Svenska      ✓
  🇯🇵 日本語
  🇪🇸 Español
```

**File:** `components/daily/DailyChallenge.tsx:299-301,354-358,372-389`

---

### 3. 3-Letter Minimum Enforcement
**Where:** `/[locale]/singleplayer` or `/[locale]/daily`

**Steps:**
1. Start any single player game or daily challenge
2. Try typing and submitting words:
   - Type "A" → Press Enter → ❌ Should reject
   - Type "IT" → Press Enter → ❌ Should reject with message "Words must be at least 3 letters long"
   - Type "CAT" → Press Enter → ✅ Should accept (if valid word on grid)
3. Switch to Hebrew language (`/he/singleplayer`)
4. Verify no 2-letter words appear in daily challenge targets

**Expected Error:**
```
┌────────────────────────────────────┐
│  ⚠️ Words must be at least        │
│     3 letters long                 │
└────────────────────────────────────┘
```

**Files:**
- `components/singleplayer/SinglePlayerGame.tsx:573,825`
- `utils/dailyChallenge.ts:905` (Hebrew words)

---

### 4. Enhanced Hint Button
**Where:** `/[locale]/singleplayer` (Solo mode only)

**Steps:**
1. Go to `/en/singleplayer`
2. Click "Solo" mode
3. Click any preset (e.g., "Easy" or "Quick Play")
4. Game starts
5. Look for **Hint Button** (usually top left or right)
6. Observe:
   - Label: "Free Hints"
   - 3 orange stars: ⭐⭐⭐
7. Click hint button
8. Hint popup appears with word clue
9. Stars should decrement: ⭐⭐☆
10. Use all 3 hints → Button becomes grayed out

**Expected:**
```
Start:    [💡 Free Hints ⭐⭐⭐]  ← Yellow button
After 1:  [💡 Free Hints ⭐⭐☆]
After 2:  [💡 Free Hints ⭐☆☆]
After 3:  [💡 Free Hints ☆☆☆]  ← Gray, disabled
```

**File:** `components/HintButton.tsx:64-83`

---

## Manual Test Script (5 Minutes)

### Quick Smoke Test

1. **Responsive Grid** (30 seconds)
   ```
   → Go to: http://localhost:3000/en/singleplayer
   → Resize browser: Mobile → Tablet → Desktop
   → Verify grid columns: 2 → 3 → 3
   ```

2. **Language Indicators** (1 minute)
   ```
   → Go to: http://localhost:3000/en/daily
   → Complete daily challenge
   → Verify badge shows "1"
   → Click language selector
   → Verify checkmark next to English
   ```

3. **3-Letter Minimum** (1 minute)
   ```
   → Go to: http://localhost:3000/en/singleplayer
   → Start Solo game (Easy preset)
   → Type "IT" and submit → Expect rejection
   → Type "CAT" and submit → Expect acceptance
   ```

4. **Hint Button** (1 minute)
   ```
   → Same game from step 3
   → Find hint button
   → Verify 3 orange stars visible
   → Click button 3 times
   → Verify stars decrement: 3→2→1→0
   → Button becomes disabled
   ```

5. **Cross-Language** (1.5 minutes)
   ```
   → Go to: http://localhost:3000/he/daily
   → Verify RTL layout (text right-to-left)
   → Go to: http://localhost:3000/sv/daily
   → Go to: http://localhost:3000/ja/daily
   → Go to: http://localhost:3000/es/daily
   → All should load without errors
   ```

**Total Time:** ~5 minutes

---

## Code Verification Checklist

### Grep Commands for Quick Verification

```bash
# 1. Check responsive grid classes
grep -n "grid-cols-2 sm:grid-cols-3" components/singleplayer/PresetSelector.tsx

# 2. Check completion count logic
grep -n "completedLanguagesCount" components/daily/DailyChallenge.tsx

# 3. Check 3-letter minimum
grep -n "minWordLength.*3" components/singleplayer/SinglePlayerGame.tsx

# 4. Check Hebrew word list (no "דג")
grep -n "דג" utils/dailyChallenge.ts
# Should return NO results (word was removed)

# 5. Check hint button stars
grep -n "FaStar" components/HintButton.tsx
```

---

## Browser Dev Tools Verification

### Responsive Grid
```javascript
// In browser console at /en/singleplayer
document.querySelector('.grid').className
// Should contain: "grid-cols-2 sm:grid-cols-3 md:grid-cols-3"
```

### Completion Badge
```javascript
// In browser console at /en/daily (after completing challenge)
document.querySelector('.bg-neo-lime').textContent
// Should show: "1" (or number of completed languages)
```

### Hint Stars
```javascript
// In browser console during Solo game
document.querySelectorAll('.text-neo-orange').length
// Should show: 3, 2, 1, or 0 (based on hints remaining)
```

---

## URLs for Testing

| Feature | URL | Expected |
|---------|-----|----------|
| Responsive Grid | http://localhost:3000/en/singleplayer | 2-3 column grid |
| Language Indicators | http://localhost:3000/en/daily | Badge + checkmarks |
| 3-Letter Validation | http://localhost:3000/en/singleplayer | Rejects < 3 letters |
| Hint Button | http://localhost:3000/en/singleplayer (Solo mode) | Stars + Free Hints |
| Hebrew RTL | http://localhost:3000/he/singleplayer | Right-to-left layout |
| Swedish | http://localhost:3000/sv/singleplayer | å, ä, ö characters |
| Japanese | http://localhost:3000/ja/singleplayer | Kanji/Hiragana |
| Spanish | http://localhost:3000/es/singleplayer | Accented characters |

---

## Screenshot Comparison

### Before vs After

**1. Responsive Grid - Mobile (Before)**
```
┌───────────┐
│  ┌───┬───┬───┐  ← 3 columns (too cramped)
│  │ 1 │ 2 │ 3 │
│  └───┴───┴───┘
└───────────┘
```

**After**
```
┌───────────┐
│  ┌───┬───┐    ← 2 columns (better spacing)
│  │ 1 │ 2 │
│  └───┴───┘
│  ┌───┬───┐
│  │ 3 │ 4 │
│  └───┴───┘
└───────────┘
```

---

## Accessibility Testing

### Keyboard Navigation
```
1. Press Tab → Should focus language selector
2. Press Tab → Should focus hint button
3. Press Enter → Should activate button
4. Press Escape → Should close dropdown/popup
```

### Screen Reader (Optional)
```
1. Enable VoiceOver (Mac: Cmd+F5) or NVDA (Windows)
2. Navigate to hint button
3. Should announce: "Button, Free Hints, 3 hints remaining"
4. Navigate to completion badge
5. Should announce count (requires aria-label enhancement)
```

### Color Contrast
```
1. Open browser dev tools
2. Inspect hint button
3. Check contrast ratio:
   - Yellow (#FFE135) vs Black (#000000) = ~16:1 ✅
   - Green (neo-lime) vs Black = ~11:1 ✅
```

---

## Debugging Tips

### Issue: Grid not responsive
**Check:** Tailwind classes are correct
```tsx
// Correct ✅
className="grid grid-cols-2 sm:grid-cols-3"

// Wrong ❌
className="grid grid-cols-3"
```

### Issue: Badge not showing
**Check:** User completed at least one language
```javascript
localStorage.getItem('dailyWordHunt_2025-12-28_en')
// Should return result object if completed
```

### Issue: 2-letter words accepted
**Check:** minWordLength is set to 3
```tsx
// Should be 3, not 2
const minWordLength = 3;
```

### Issue: Hint button missing
**Check:** You're in Solo mode (hints only available in single-player)
```
/en/singleplayer → Solo mode ✅
/en/singleplayer → Challenge mode ❌ (no hints)
/en/singleplayer → Battle mode ❌ (no hints)
```

---

## Test Reports Location

1. **Full Detailed Report:**
   `/Users/ohadfisher/git/boggle-new/fe-next/UI_TEST_REPORT.md`

2. **Visual Summary:**
   `/Users/ohadfisher/git/boggle-new/fe-next/VISUAL_TEST_SUMMARY.md`

3. **Executive Summary:**
   `/Users/ohadfisher/git/boggle-new/fe-next/TEST_EXECUTIVE_SUMMARY.md`

4. **This Quick Reference:**
   `/Users/ohadfisher/git/boggle-new/fe-next/TESTING_QUICK_REFERENCE.md`

---

**Need Help?** Refer to main test report for detailed analysis and screenshots.
