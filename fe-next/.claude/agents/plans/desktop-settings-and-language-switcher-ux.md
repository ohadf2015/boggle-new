# Feature: Desktop Settings Access for Guest Players + Simplified Language Switching UX

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

This feature addresses two UX improvements:
1. **Desktop Settings Access for Guests**: Currently, the desktop header shows settings only in the mobile menu. Guest players (not authenticated) on desktop have no direct way to access settings from the header - they must navigate to mobile view or know the `/settings` URL.
2. **Simplified Language Switching UX**: Changing language currently requires navigating to the Settings page and using a dropdown. This should be made more accessible with a quick-switch pattern directly in the header (both mobile and desktop).

## User Story

As a **guest player** (not logged in)
I want to **access settings directly from the desktop header** and **change language quickly** without navigating to a separate page
So that **I can customize my experience (language, theme, sound) easily regardless of my device or login status**

## Problem Statement

1. **Desktop guests have no settings shortcut**: The `Header.tsx` desktop controls section (lines 289-349) only shows controls for authenticated users. Guest users see nothing in this area except MusicControls and AuthButton. They have to either:
   - Use mobile view to access the hamburger menu
   - Manually type `/settings` in the URL

2. **Language switching is buried**: To change language, users must:
   - Open Settings page
   - Find the language dropdown
   - Select their language
   - Wait for page reload

   This is 3-4 clicks/taps when it could be 2 clicks (open picker, select language).

## Solution Statement

1. **Add Settings icon button to desktop header for all users** (guests and authenticated):
   - Display a Settings icon (gear) in the desktop header controls area
   - Links to `/[locale]/settings` page
   - Follows existing neo-brutalist button styling pattern

2. **Add Quick Language Switcher component**:
   - Create a compact language toggle that shows current flag + can expand to show all 5 languages
   - Available in both desktop header and mobile menu
   - One-click to change language (no page navigation required)
   - Uses existing `setLanguage` from LanguageContext which handles URL routing

## Feature Metadata

**Feature Type:** Enhancement
**Estimated Complexity:** Medium (< 2 days)
**Primary Systems Affected:**
- `components/Header.tsx` - Add settings button and language switcher to desktop
- New component: `components/QuickLanguageSwitcher.tsx`
- Translation files (5 languages) - Add new keys
- Tests for new component and Header changes

**Dependencies:**
- Existing LanguageContext and `setLanguage` function
- Radix UI Select component (already in use)
- Lucide icons (already in use)

---

## CONTEXT REFERENCES

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

- `components/Header.tsx` (full file, especially lines 289-380)
  - **WHY:** Main component to modify - add settings button to desktop controls
  - **PATTERN:** Neo-brutalist button styling, memo pattern, useLanguage/useAuth hooks
  - **KEY INSIGHT:** Desktop controls at line 290 are hidden for `sm:hidden` - need to add `sm:flex` items

- `components/join/LanguageSelector.tsx` (full file)
  - **WHY:** Existing language selector pattern using Radix Select
  - **PATTERN:** Memoized component, LANGUAGE_OPTIONS array with code/flag/labelKey

- `app/[locale]/settings/page.tsx` (lines 19-25, 220-240)
  - **WHY:** Shows how language changing is currently implemented
  - **PATTERN:** Native `<select>` with `setLanguage` from context

- `contexts/LanguageContext.tsx` (full file, especially lines 145-169)
  - **WHY:** Contains `setLanguage` function that handles URL navigation
  - **PATTERN:** `setLanguage` updates state, cookie, and navigates to new locale path

- `components/ui/select.tsx` (full file)
  - **WHY:** Radix UI Select component with neo-brutalist styling
  - **PATTERN:** Use SelectTrigger, SelectContent, SelectItem for dropdowns

- `translations/en.js` (lines 278-303 for settings section)
  - **WHY:** Translation key patterns
  - **PATTERN:** Nested object structure with kebab-case or camelCase keys

### New Files to Create

- `components/QuickLanguageSwitcher.tsx` - Compact language toggle for header
- `components/__tests__/QuickLanguageSwitcher.test.tsx` - Unit tests
- `__tests__/Header.settings-button.test.tsx` - Tests for new header functionality

### Patterns to Follow

**Neo-Brutalist Button Pattern (from Header.tsx lines 307-324):**

```tsx
<Link
  href={`/${language}/settings`}
  className={cn(
    "flex items-center justify-center",
    "w-10 h-10",
    "bg-neo-cream text-neo-black",
    "border-2 border-neo-black",
    "rounded-neo shadow-hard-sm",
    "hover:-translate-x-px hover:-translate-y-px hover:shadow-hard hover:bg-neo-cyan/30",
    "active:translate-x-px active:translate-y-px active:shadow-none",
    "transition-all duration-100"
  )}
  aria-label={t('settings.title') || 'Settings'}
>
  <Settings size={20} />
</Link>
```

**Language Options Array Pattern (from LanguageSelector.tsx):**

```tsx
const LANGUAGE_OPTIONS = [
  { code: 'en', flag: '🇺🇸', labelKey: 'joinView.english' },
  { code: 'he', flag: '🇮🇱', labelKey: 'joinView.hebrew' },
  { code: 'sv', flag: '🇸🇪', labelKey: 'joinView.swedish' },
  { code: 'ja', flag: '🇯🇵', labelKey: 'joinView.japanese' },
  { code: 'es', flag: '🇪🇸', labelKey: 'joinView.spanish' },
];
```

**Memoized Component Pattern:**

```tsx
export const QuickLanguageSwitcher = memo<Props>(({ className }) => {
  const { language, setLanguage, t, currentFlag } = useLanguage();
  // ... implementation
});
QuickLanguageSwitcher.displayName = 'QuickLanguageSwitcher';
```

---

## IMPLEMENTATION PLAN

### Phase 1: Create QuickLanguageSwitcher Component

Create a new compact language switcher component that can be used in both desktop header and mobile menu.

**Design:**
- Shows current language flag (clickable trigger)
- Opens Radix Select dropdown with all 5 languages
- Selecting a language calls `setLanguage` from context (handles navigation)
- Compact size suitable for header placement

### Phase 2: Update Header Desktop Controls

Add two elements to the desktop controls area:
1. Settings button (icon only, links to settings page) - visible for ALL users
2. QuickLanguageSwitcher component - visible for ALL users

### Phase 3: Update Header Mobile Menu

Replace the current settings link in mobile menu with QuickLanguageSwitcher for faster language switching. Keep the settings link but make it clearer that it's for more settings.

### Phase 4: Add Translation Keys

Add new translation keys for:
- Quick language switcher tooltip/aria-label
- Any new button labels needed

### Phase 5: Testing & Validation

Write comprehensive tests for:
- QuickLanguageSwitcher component functionality
- Header rendering with settings button for guests vs authenticated users
- Language switching behavior

---

## STEP-BY-STEP TASKS

### Task 1: CREATE `components/QuickLanguageSwitcher.tsx`

- **IMPLEMENT:** Compact language selector using Radix Select
- **PATTERN:** Mirror `components/join/LanguageSelector.tsx` structure but with compact trigger (flag only)
- **IMPORTS:**
  ```tsx
  import { memo } from 'react';
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
  import { useLanguage } from '@/contexts/LanguageContext';
  import { cn } from '@/lib/utils';
  import type { Language } from '@/types';
  ```
- **GOTCHA:** Ensure RTL support - test with Hebrew
- **GOTCHA:** Trigger must show flag emoji clearly at small sizes
- **VALIDATE:** `npm run lint && npm run test:frontend -- --testPathPattern=QuickLanguageSwitcher`

### Task 2: CREATE `components/__tests__/QuickLanguageSwitcher.test.tsx`

- **IMPLEMENT:** Unit tests for QuickLanguageSwitcher
  - Renders current language flag
  - Shows all 5 language options when opened
  - Calls setLanguage when option selected
  - Has proper aria-labels for accessibility
- **PATTERN:** Mirror `__tests__/components/Header.cls.test.tsx` test structure
- **VALIDATE:** `npm run test:frontend -- --testPathPattern=QuickLanguageSwitcher`

### Task 3: UPDATE `components/Header.tsx` - Add Desktop Settings Button

- **IMPLEMENT:** Add Settings icon button to desktop controls area (line ~290)
  - Position after MusicControls, before AuthButton
  - Use Link component to navigate to `/${language}/settings`
  - Use existing neo-brutalist button styling
  - Visible for ALL users (remove `isAuthenticated &&` condition for this button)
- **PATTERN:** Reference lines 307-324 for button styling pattern
- **IMPORTS:** Settings icon already imported at line 4
- **GOTCHA:** Ensure it doesn't break layout for authenticated users who already see many items
- **VALIDATE:** `npm run build && npm run lint`

### Task 4: UPDATE `components/Header.tsx` - Add QuickLanguageSwitcher to Desktop

- **IMPLEMENT:** Add QuickLanguageSwitcher after Settings button in desktop controls
  - Import the new component
  - Add after Settings button, before AuthButton
  - Visible for ALL users
- **PATTERN:** Compact inline element in flex container
- **IMPORTS:** `import { QuickLanguageSwitcher } from './QuickLanguageSwitcher';`
- **GOTCHA:** Test responsive behavior - ensure header doesn't overflow on smaller screens
- **VALIDATE:** `npm run build && npm run lint`

### Task 5: UPDATE `components/Header.tsx` - Enhance Mobile Menu Language Section

- **IMPLEMENT:** In mobile menu, add QuickLanguageSwitcher in addition to settings link
  - Add QuickLanguageSwitcher in the Settings section (around line 516)
  - Keep the Settings link but update label to be clearer (just "More Settings" or similar)
  - Show current flag + language name in trigger for mobile (more space available)
- **PATTERN:** Follow existing mobile menu section styling
- **GOTCHA:** Ensure mobile menu still closes properly after language change
- **VALIDATE:** Manual testing on mobile viewport

### Task 6: UPDATE Translation Files - Add New Keys

- **IMPLEMENT:** Add new translation keys to all 5 language files:
  ```javascript
  "settings": {
    // ... existing keys
    "changeLanguage": "Change Language",  // NEW
    "moreSettings": "More Settings",       // NEW
  }
  ```
- **PATTERN:** Follow existing translation structure in `translations/*.js`
- **FILES:** `en.js`, `he.js`, `sv.js`, `ja.js`, `es.js`
- **VALIDATE:** `npm run build` (will fail if translation keys are missing)

### Task 7: CREATE `__tests__/Header.settings-button.test.tsx`

- **IMPLEMENT:** Tests for new header functionality
  - Settings button visible for guest users on desktop
  - Settings button visible for authenticated users on desktop
  - Settings button links to correct locale-prefixed URL
  - QuickLanguageSwitcher visible for all users
- **PATTERN:** Mirror `__tests__/Header.avatar.test.tsx` structure
- **VALIDATE:** `npm run test:frontend -- --testPathPattern=Header.settings-button`

### Task 8: VERIFY Build and All Tests

- **IMPLEMENT:** Run full build and test suite
- **VALIDATE:**
  ```bash
  npm run lint
  npm run build
  npm run test
  ```

---

## TESTING STRATEGY

### Unit Tests

**Scope and Requirements:**
- Test QuickLanguageSwitcher renders correctly
- Test language change callback is called
- Test Header renders settings button for guests
- Test Header renders settings button for authenticated users
- Test aria-labels and accessibility

**Pattern:**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock contexts
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: jest.fn(),
    t: (key: string) => key,
    currentFlag: '🇺🇸',
  }),
}));

describe('QuickLanguageSwitcher', () => {
  it('should render current language flag', () => {
    render(<QuickLanguageSwitcher />);
    expect(screen.getByText('🇺🇸')).toBeInTheDocument();
  });

  it('should call setLanguage when option selected', async () => {
    const mockSetLanguage = jest.fn();
    // ... test implementation
  });
});
```

### Edge Cases

- RTL layout (Hebrew)
- Mobile viewport widths
- Guest vs authenticated users
- Language change during active session

---

## VALIDATION COMMANDS

### Level 1: Linting

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run lint
```

**Expected:** No linting errors

### Level 2: TypeScript Compilation

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run build
```

**Expected:** Build succeeds with no TypeScript errors

### Level 3: Unit Tests

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run test:frontend
```

**Expected:** All tests pass

### Level 4: Specific Test Files

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run test:frontend -- --testPathPattern="QuickLanguageSwitcher|Header.settings"
```

**Expected:** New tests pass

### Level 5: Manual Testing

1. **Desktop Guest User:**
   - Open app in incognito/logged out state
   - Verify Settings icon visible in header
   - Verify QuickLanguageSwitcher visible with current flag
   - Click Settings icon → navigates to `/[locale]/settings`
   - Click language flag → shows all 5 languages
   - Select different language → page updates to new locale

2. **Desktop Authenticated User:**
   - Log in to app
   - Verify Settings icon still visible
   - Verify QuickLanguageSwitcher still visible
   - All functionality works same as guest

3. **Mobile (any user):**
   - Open hamburger menu
   - Verify QuickLanguageSwitcher in menu
   - Select different language → page updates, menu closes

4. **RTL Testing (Hebrew):**
   - Switch to Hebrew
   - Verify header layout is correct RTL
   - Verify dropdown opens correctly in RTL

---

## ACCEPTANCE CRITERIA

- [ ] Settings icon button visible in desktop header for ALL users (guest and authenticated)
- [ ] QuickLanguageSwitcher component visible in desktop header for ALL users
- [ ] QuickLanguageSwitcher available in mobile hamburger menu
- [ ] Language can be changed with 2 clicks (click flag, click language)
- [ ] Language change updates URL and page content correctly
- [ ] All 5 languages selectable (en, he, sv, ja, es)
- [ ] RTL layout works correctly for Hebrew
- [ ] Accessibility: proper aria-labels on all interactive elements
- [ ] All existing tests still pass
- [ ] New unit tests for QuickLanguageSwitcher
- [ ] New tests for Header settings button visibility
- [ ] Build passes with no errors
- [ ] Lint passes with no errors

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability

---

## NOTES

**Design Rationale:**

- **Why Radix Select for language picker?** Consistency with existing LanguageSelector and UI components. Radix provides accessibility out of the box.
- **Why show settings button for all users, not just guests?** Better UX consistency - all users benefit from quick settings access. Authenticated users may still want to change theme/sound settings quickly.
- **Why keep Settings page link in mobile menu?** The QuickLanguageSwitcher only handles language. Users need access to full settings (theme, sound, accessibility) which requires the settings page.

**Alternatives Considered:**

1. **Popover with all settings**: Too complex for header, would require significant state management
2. **Language flags in a row**: Takes too much horizontal space with 5 languages
3. **Tooltip on hover**: Not mobile-friendly, accessibility concerns

**Future Considerations:**

- Could add keyboard shortcuts for language switching (e.g., Ctrl+L)
- Could persist recently used languages at top of list
- Could add search/filter for languages if list grows beyond 5-6
