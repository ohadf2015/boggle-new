# Feature: Daily Buzz Letter Hints & Template Editor UX Improvements

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

This enhancement improves the Daily Buzz experience in two ways:
1. **Auto-reveal First Letter**: Help players get started on Fill Blank challenges by automatically showing the first letter
2. **Template Editor UX**: Improve the admin Prompt Template Editor with better preview, validation, and visual feedback

## User Story

**Part A - Player Experience:**
As a Daily Buzz player
I want to see the first letter of Fill Blank answers automatically
So that I have a helpful starting point for guessing the word

**Part B - Admin Experience:**
As a Daily Buzz admin
I want better UX when editing prompt templates
So that I can confidently update templates without breaking variable placeholders

## Problem Statement

**Part A:**
Players sometimes struggle with Fill Blank challenges because they don't know where to start. The blank underscores (_ _ _ _) provide no hints, making very difficult words frustrating. Auto-revealing the first letter creates a better balance between challenge and accessibility.

**Part B:**
The current Prompt Template Editor works functionally but lacks:
- Preview of how the template looks with real data
- Validation to prevent accidental deletion of required placeholders ({topic}, {language}, etc.)
- Clear visual feedback about which placeholders are required vs optional
- Better layout and spacing for long templates

## Solution Statement

**Part A:**
Modify `FillBlankChallenge.tsx` to automatically pre-fill and disable the first letter box. Players will see the first letter immediately and start typing from the second box. This provides just enough hint to get started without giving away the answer.

**Part B:**
Enhance the Prompt Template Editor with:
1. **Template Preview Component**: Shows rendered template with sample data
2. **Placeholder Validation**: Warns if required placeholders are missing
3. **Visual Placeholder Highlighting**: Different colors for required vs optional placeholders
4. **Improved Layout**: Better spacing, clearer labels, collapsible sections

## Feature Metadata

**Feature Type:** Enhancement
**Estimated Complexity:** Medium
**Primary Systems Affected:**
- Frontend: Daily Buzz challenge components
- Frontend: Admin prompt template components
- Translations: New UI text keys

**Dependencies:**
- None (uses existing libraries)

---

## CONTEXT REFERENCES

### Prime Context (READ THIS FIRST!)

- `.claude/agents/context/prime-context.md` - COMPLETE codebase overview
  - **WHY:** Contains all project patterns, configurations, and architecture
  - **ACTION:** Read this file first to understand the codebase

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

**Part A - Fill Blank Challenge:**

- `components/buzz/challenges/FillBlankChallenge.tsx` (lines 1-350)
  - **WHY:** Current implementation to modify for first-letter reveal
  - **PATTERN:** React functional component with useState, useRef, useCallback
  - **KEY LOGIC:** Lines 40-77 (letter input handling), lines 192-283 (letter boxes rendering)

- `components/buzz/BuzzChallenge.tsx`
  - **WHY:** Parent component that renders FillBlankChallenge
  - **PATTERN:** Challenge type routing and state management

- `backend/services/buzz/promptBuilder.ts` (lines 196-201)
  - **WHY:** Shows fill_blank format with underscores (doesn't need changes, but understand context)
  - **PATTERN:** AI prompt generation for fill_blank challenges

**Part B - Template Editor:**

- `components/admin/buzz/PromptTemplateEditor.tsx` (lines 1-323)
  - **WHY:** Main orchestrator component to enhance
  - **PATTERN:** Container component with state management, API calls

- `components/admin/buzz/prompt-templates/TemplateForm.tsx` (lines 1-134)
  - **WHY:** Form component to enhance with preview and validation
  - **PATTERN:** Controlled form with TemplateFormData interface

- `components/admin/buzz/prompt-templates/constants.ts` (lines 1-61)
  - **WHY:** DEFAULT_PLACEHOLDERS define required placeholders per template type
  - **PATTERN:** Type-safe constants with TemplatePlaceholder interface

- `components/admin/buzz/types.ts` (lines 98-127)
  - **WHY:** PromptTemplate and TemplateType definitions
  - **PATTERN:** TypeScript interfaces for templates

- `app/api/admin/buzz/prompt-templates/route.ts`
  - **WHY:** API route for fetching/creating templates (no changes needed, but understand flow)

### New Files to Create

**Part A:**
- `components/buzz/challenges/__tests__/FillBlankChallenge.firstLetter.test.tsx` - Tests for first letter reveal

**Part B:**
- `components/admin/buzz/prompt-templates/TemplatePreview.tsx` - Preview component with sample data
- `components/admin/buzz/prompt-templates/utils/placeholderValidator.ts` - Validation utility
- `components/admin/buzz/prompt-templates/__tests__/TemplatePreview.test.tsx` - Preview component tests
- `components/admin/buzz/prompt-templates/__tests__/placeholderValidator.test.tsx` - Validator tests

### Relevant Documentation (MUST READ!)

- [React 19 Documentation](https://react.dev/)
  - **Section:** Hooks Reference (useState, useCallback, useMemo)
  - **WHY:** Component state management patterns

- [Framer Motion](https://www.framer.com/motion/)
  - **Section:** AnimatePresence for conditional rendering
  - **WHY:** Animate template preview entrance/exit

- [Tailwind CSS](https://tailwindcss.com/)
  - **Section:** Neo-Brutalist design system in tailwind.config.js
  - **WHY:** Apply consistent styling (shadow-hard, border-neo, colors)

### Patterns to Follow

**Frontend Component Pattern (Fill Blank Challenge):**

```typescript
// ✅ GOOD: State management for first letter reveal
const [letters, setLetters] = useState<string[]>(() => {
  const initial = Array(answerLength).fill('');
  // Pre-fill first letter
  if (answerLength > 0 && challenge.answer) {
    initial[0] = challenge.answer[0].toUpperCase();
  }
  return initial;
});
```

**Frontend Component Pattern (Template Editor):**

```typescript
// ✅ GOOD: Template preview with sample data
interface TemplatePreviewProps {
  templateContent: string;
  placeholders: TemplatePlaceholder[];
  templateType: TemplateType;
}

export function TemplatePreview({ templateContent, placeholders, templateType }: TemplatePreviewProps) {
  const sampleData = getSampleDataForType(templateType);
  const renderedTemplate = renderTemplate(templateContent, sampleData);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
    >
      <h4 className="text-xs font-bold text-neo-cyan mb-2">Preview with Sample Data</h4>
      <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
        {renderedTemplate}
      </pre>
    </motion.div>
  );
}
```

**Placeholder Validation Pattern:**

```typescript
// ✅ GOOD: Validate required placeholders
export interface ValidationResult {
  isValid: boolean;
  missingPlaceholders: string[];
  unusedPlaceholders: string[];
  warnings: string[];
}

export function validateTemplate(
  content: string,
  requiredPlaceholders: TemplatePlaceholder[]
): ValidationResult {
  const placeholdersInContent = extractPlaceholders(content);
  const requiredNames = requiredPlaceholders.map(p => p.name);

  const missing = requiredNames.filter(name => !placeholdersInContent.includes(name));
  const unused = placeholdersInContent.filter(name => !requiredNames.includes(name));

  return {
    isValid: missing.length === 0,
    missingPlaceholders: missing,
    unusedPlaceholders: unused,
    warnings: missing.length > 0
      ? [`Missing required placeholders: ${missing.join(', ')}`]
      : []
  };
}
```

**Translation Pattern:**

```typescript
// ✅ GOOD: All UI text uses t() function
import { useLanguage } from '@/contexts/LanguageContext';

const { t } = useLanguage();

// In component:
<p>{t('buzz.fillBlank.firstLetterHint')}</p>
<p>{t('admin.templateEditor.previewTitle')}</p>
```

**Testing Pattern (Fill Blank):**

```typescript
// ✅ GOOD: Test first letter reveal
import { render, screen } from '@testing-library/react';
import FillBlankChallenge from '../FillBlankChallenge';

test('should show first letter automatically', () => {
  // GIVEN
  const challenge = {
    prompt: 'Fill in the blank: _ _ _ _ (4 letters)',
    answer: 'WORD',
    hint: 'A unit of language'
  };

  // WHEN
  render(<FillBlankChallenge challenge={challenge} onAnswer={jest.fn()} showHint={false} />);

  // THEN
  const firstBox = screen.getAllByLabelText(/Letter/)[0];
  expect(firstBox).toHaveValue('W');
  expect(firstBox).toBeDisabled();
});
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation - Part A (First Letter Reveal)

Setup base structure for auto-revealing first letter in Fill Blank challenges.

**Tasks:**

- Update FillBlankChallenge component to pre-fill first letter
- Add visual indicator that first letter is a hint
- Add translation keys for new UI text
- Create unit tests for first letter behavior

**Order:** Must complete before Phase 2 (independent of Part B).

### Phase 2: Foundation - Part B (Template Validation Utility)

Create validation utility for template placeholders before building UI.

**Tasks:**

- Create `placeholderValidator.ts` utility with validation logic
- Add unit tests for validator edge cases
- Export validation result types

**Order:** Must complete before Phase 3.

### Phase 3: Core Implementation - Part A (Letter Box Logic)

Implement the first letter reveal logic in FillBlankChallenge.

**Tasks:**

- Modify state initialization to pre-fill first letter
- Update letter box rendering to disable first box
- Adjust focus logic to skip first box
- Update keyboard navigation to handle disabled first box
- Add visual styling to distinguish hint letter from user input

**Order:** Depends on Phase 1 completion.

### Phase 4: Core Implementation - Part B (Template Preview Component)

Build the template preview component with sample data rendering.

**Tasks:**

- Create TemplatePreview component
- Implement sample data generator per template type
- Add template rendering logic (replace placeholders)
- Style preview with Neo-Brutalist design
- Add animation with Framer Motion

**Order:** Depends on Phase 2 completion.

### Phase 5: Integration - Part B (Enhance TemplateForm)

Integrate validation and preview into TemplateForm component.

**Tasks:**

- Add TemplatePreview to TemplateForm
- Integrate placeholderValidator for real-time validation
- Add visual feedback for validation errors (red border, warning icon)
- Add collapsible preview section
- Improve layout and spacing

**Order:** Depends on Phase 4 completion.

### Phase 6: Testing & Validation

Comprehensive testing for both parts.

**Tasks:**

- Run all unit tests (Part A + Part B)
- Add integration tests for admin flow
- Manual testing in all 5 languages (Hebrew RTL especially)
- Validate on different screen sizes (CrazyGames breakpoints)
- Check accessibility (keyboard navigation, screen readers)

**Order:** After Phase 3 and Phase 5 completion.

---

## STEP-BY-STEP TASKS

**IMPORTANT:** Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 1: ADD translation keys for first letter hint

- **IMPLEMENT:** Add new translation keys to all 5 language files
- **PATTERN:** Mirror existing buzz translation structure (see translations/en.js:100-150)
- **KEYS TO ADD:**
  ```javascript
  buzz: {
    fillBlank: {
      firstLetterHint: "First letter revealed as a hint",
      hintLetter: "Hint"
    }
  },
  admin: {
    templateEditor: {
      previewTitle: "Preview with Sample Data",
      validationTitle: "Template Validation",
      missingPlaceholders: "Missing required placeholders",
      unusedPlaceholders: "Unused placeholders detected",
      validTemplate: "Template is valid"
    }
  }
  ```
- **FILES:**
  - `translations/en.js`
  - `translations/he.js`
  - `translations/sv.js`
  - `translations/ja.js`
  - `translations/es.js`
- **GOTCHA:** Hebrew translations must be native Hebrew text, not transliterated English
- **VALIDATE:** `npm run check:translations`

### Task 2: CREATE placeholderValidator utility

- **IMPLEMENT:** Validation utility for template placeholders
- **PATTERN:** Pure function utility (see `backend/utils/featureFlags.ts:1-50` for utility pattern)
- **FILE:** `components/admin/buzz/prompt-templates/utils/placeholderValidator.ts`
- **EXPORTS:**
  ```typescript
  export interface ValidationResult {
    isValid: boolean;
    missingPlaceholders: string[];
    unusedPlaceholders: string[];
    warnings: string[];
  }

  export function extractPlaceholders(content: string): string[];
  export function validateTemplate(
    content: string,
    requiredPlaceholders: TemplatePlaceholder[]
  ): ValidationResult;
  ```
- **GOTCHA:** Handle edge cases (malformed placeholders, nested braces, escaped braces)
- **VALIDATE:** Unit tests (next task)

### Task 3: CREATE placeholderValidator tests

- **IMPLEMENT:** Comprehensive tests for validator
- **PATTERN:** Given-When-Then structure (see `.claude/rules/21-testing.md`)
- **FILE:** `components/admin/buzz/prompt-templates/__tests__/placeholderValidator.test.ts`
- **TEST CASES:**
  - Should extract simple placeholders: `{topic}`, `{language}`
  - Should handle missing required placeholders
  - Should detect unused placeholders
  - Should handle malformed placeholders: `{topic`, `topic}`, `{{topic}}`
  - Should ignore escaped braces: `\{not_placeholder\}`
  - Should return valid result when all placeholders present
- **VALIDATE:** `npm run test:frontend -- placeholderValidator`

### Task 4: UPDATE FillBlankChallenge for first letter reveal

- **IMPLEMENT:** Auto-reveal first letter in fill blank challenges
- **PATTERN:** Mirror existing state initialization (FillBlankChallenge.tsx:40-46)
- **FILE:** `components/buzz/challenges/FillBlankChallenge.tsx`
- **CHANGES:**
  ```typescript
  // Initialize with first letter pre-filled
  const [letters, setLetters] = useState<string[]>(() => {
    const initial = Array(answerLength).fill('');
    if (answerLength > 0 && challenge.answer) {
      initial[0] = challenge.answer[0].toUpperCase();
    }
    return initial;
  });

  // Start active index at 1 (skip first box)
  const [activeIndex, setActiveIndex] = useState(1);

  // Render first box as disabled with hint styling
  const isFirstBox = index === 0;
  const isHintLetter = isFirstBox && letter;

  <motion.div
    className={`
      ${isHintLetter ? 'border-neo-yellow bg-neo-yellow/20' : ''}
      ${isFirstBox ? 'cursor-not-allowed' : 'cursor-pointer'}
    `}
  >
    <input
      disabled={isFirstBox}
      // ... rest of input props
    />
    {isHintLetter && (
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-neo-yellow">
        {t('buzz.fillBlank.hintLetter')}
      </div>
    )}
  </motion.div>
  ```
- **GOTCHA:**
  - RTL languages (Hebrew) - first letter is rightmost
  - Focus management - skip first box
  - Keyboard navigation - ArrowLeft/Right should skip first box
  - Backspace from second box should NOT go to first box
- **VALIDATE:** Manual testing + unit tests (next task)

### Task 5: CREATE FillBlankChallenge first letter tests

- **IMPLEMENT:** Tests for first letter reveal behavior
- **PATTERN:** React Testing Library (see `components/buzz/__tests__/BuzzChallenge.test.tsx`)
- **FILE:** `components/buzz/challenges/__tests__/FillBlankChallenge.firstLetter.test.tsx`
- **TEST CASES:**
  - Should pre-fill first letter on mount
  - Should disable first letter box
  - Should focus second box on mount (not first)
  - Should not allow editing first letter
  - Should show hint label above first letter
  - Should handle RTL (Hebrew) correctly (first letter is rightmost)
  - Should skip first box when navigating with ArrowLeft
  - Backspace from second box should clear second box (not move to first)
- **VALIDATE:** `npm run test:frontend -- FillBlankChallenge.firstLetter`

### Task 6: CREATE TemplatePreview component

- **IMPLEMENT:** Preview component with sample data rendering
- **PATTERN:** Mirror TemplateForm component structure (prompt-templates/TemplateForm.tsx:30-133)
- **FILE:** `components/admin/buzz/prompt-templates/TemplatePreview.tsx`
- **INTERFACE:**
  ```typescript
  interface TemplatePreviewProps {
    templateContent: string;
    placeholders: TemplatePlaceholder[];
    templateType: TemplateType;
  }
  ```
- **LOGIC:**
  ```typescript
  // Sample data per template type
  const SAMPLE_DATA: Record<TemplateType, Record<string, string>> = {
    riddle: {
      topic: 'Climate Summit 2026',
      language: 'en',
      difficulty: 'medium',
      context: 'World leaders gathering to discuss climate action'
    },
    image: {
      topic: 'Super Bowl',
      category: 'sports',
      language: 'en',
      mood: 'energetic and exciting'
    },
    // ... etc
  };

  function renderTemplate(content: string, data: Record<string, string>): string {
    return content.replace(/\{(\w+)\}/g, (match, key) =>
      data[key] || match
    );
  }
  ```
- **STYLING:** Neo-Brutalist design with collapsible AnimatePresence
- **GOTCHA:** Highlight replaced placeholders with different color
- **VALIDATE:** Visual inspection + unit tests (next task)

### Task 7: CREATE TemplatePreview tests

- **IMPLEMENT:** Tests for preview component
- **PATTERN:** React Testing Library with snapshot testing
- **FILE:** `components/admin/buzz/prompt-templates/__tests__/TemplatePreview.test.tsx`
- **TEST CASES:**
  - Should render preview with sample data
  - Should replace placeholders correctly
  - Should highlight replaced placeholders
  - Should handle template with no placeholders
  - Should handle template with invalid placeholders
  - Should collapse/expand with animation
- **VALIDATE:** `npm run test:frontend -- TemplatePreview`

### Task 8: UPDATE TemplateForm with preview and validation

- **IMPLEMENT:** Integrate preview and validation into form
- **PATTERN:** Controlled component with derived state (TemplateForm.tsx:39-44)
- **FILE:** `components/admin/buzz/prompt-templates/TemplateForm.tsx`
- **CHANGES:**
  ```typescript
  import { TemplatePreview } from './TemplatePreview';
  import { validateTemplate } from './utils/placeholderValidator';

  // Add validation state
  const validation = useMemo(
    () => validateTemplate(formData.template_content, formData.placeholders),
    [formData.template_content, formData.placeholders]
  );

  // Add preview toggle state
  const [showPreview, setShowPreview] = useState(false);

  // Update isValid to include validation
  const isValid =
    formData.name.trim() !== '' &&
    formData.template_content.trim() !== '' &&
    validation.isValid;

  // Render validation feedback
  {!validation.isValid && (
    <div className="p-3 bg-red-900/30 border border-red-500 rounded-lg">
      <AlertCircle className="w-4 h-4 text-red-400 inline" />
      <span className="text-sm text-red-400 ml-2">
        {validation.warnings.join(', ')}
      </span>
    </div>
  )}

  // Render preview
  <button onClick={() => setShowPreview(!showPreview)}>
    {showPreview ? 'Hide' : 'Show'} Preview
  </button>
  {showPreview && (
    <TemplatePreview
      templateContent={formData.template_content}
      placeholders={formData.placeholders}
      templateType={formData.template_type}
    />
  )}
  ```
- **GOTCHA:**
  - Validation should update in real-time (useMemo)
  - Preview toggle should be smooth (AnimatePresence)
  - Validation errors should be clear and actionable
- **VALIDATE:** Manual testing in admin panel

### Task 9: UPDATE TemplateForm styling and layout

- **IMPLEMENT:** Improve layout, spacing, and visual feedback
- **PATTERN:** Neo-Brutalist design system (tailwind.config.js)
- **FILE:** `components/admin/buzz/prompt-templates/TemplateForm.tsx`
- **IMPROVEMENTS:**
  - Increase textarea height for template_content (h-64 → h-80)
  - Add placeholder highlighting in textarea (use CodeMirror or syntax highlighting)
  - Add validation icon next to template_content label (CheckCircle or AlertCircle)
  - Better spacing between sections (space-y-4 → space-y-6)
  - Add divider between form and preview
  - Improve button styling (larger, more prominent)
- **VALIDATE:** Visual inspection in admin panel

### Task 10: ADD integration tests for admin flow

- **IMPLEMENT:** E2E tests for template editor workflow
- **PATTERN:** Playwright E2E tests (see `playwright.config.ts`)
- **FILE:** `__tests__/e2e/admin-template-editor.spec.ts`
- **TEST FLOWS:**
  1. Admin opens template editor
  2. Admin edits riddle template
  3. Admin adds new placeholder (should show validation error)
  4. Admin removes required placeholder (should show validation error)
  5. Admin fixes validation error
  6. Admin toggles preview
  7. Admin saves template
  8. Template updates successfully
- **VALIDATE:** `npm run test:e2e -- admin-template-editor`

---

## TESTING STRATEGY

### Unit Tests

**Scope and Requirements:**

- Test all public methods and React component rendering
- Mock external dependencies (API calls, translation function)
- Use Jest + React Testing Library
- Coverage target: 90%+ for new/modified code

**Pattern:**

```typescript
// Given-When-Then structure
test('should auto-reveal first letter in fill blank challenge', () => {
  // GIVEN
  const challenge = {
    prompt: 'Fill in the blank',
    answer: 'WORD',
    hint: 'A unit of language'
  };
  const onAnswer = jest.fn();

  // WHEN
  render(
    <FillBlankChallenge
      challenge={challenge}
      onAnswer={onAnswer}
      showHint={false}
    />
  );

  // THEN
  const firstBox = screen.getAllByLabelText(/Letter/)[0];
  expect(firstBox).toHaveValue('W');
  expect(firstBox).toBeDisabled();

  const secondBox = screen.getAllByLabelText(/Letter/)[1];
  expect(secondBox).toHaveFocus();
});
```

### Integration Tests

**Scope and Requirements:**

- Test admin template editor workflow end-to-end
- Use Playwright for browser automation
- Test validation, preview, and save flow
- Test on Desktop and Mobile viewports

**Pattern:**

```typescript
test('admin can edit template with validation', async ({ page }) => {
  // Given: Admin is logged in and on template editor page
  await page.goto('/admin/daily-buzz');
  await page.click('button:has-text("Prompt Templates")');

  // When: Admin edits riddle template
  await page.click('button:has-text("Edit")');
  await page.fill('textarea[name="template_content"]', 'New template without {topic}');

  // Then: Validation error appears
  await expect(page.locator('text=Missing required placeholders: topic')).toBeVisible();

  // When: Admin fixes the error
  await page.fill('textarea[name="template_content"]', 'New template with {topic}');

  // Then: Validation passes and save is enabled
  await expect(page.locator('button:has-text("Save Changes")')).toBeEnabled();
});
```

### Edge Cases

**List specific edge cases that must be tested for this feature:**

**Part A (First Letter Reveal):**
- Single-letter words (only one box, which is the hint)
- Two-letter words (first is hint, second is user input)
- RTL languages (Hebrew) - first letter is rightmost
- Very long words (15+ letters) with horizontal scrolling
- Multi-word answers (should only reveal first letter of first word)

**Part B (Template Editor):**
- Template with no placeholders (should still be valid)
- Template with malformed placeholders: `{topic`, `topic}`, `{{topic}}`
- Template with ALL required placeholders removed
- Template with extra unused placeholders
- Very long templates (1000+ characters)
- Templates with special characters in content
- Save while validation is pending

---

## VALIDATION COMMANDS

**⚠️ CRITICAL SAFETY RULE: ALL validation must be done in LOCAL DEV MODE!**

**Environment Requirements:**
- ✅ Development server running locally
- ✅ NOT connected to production database
- ❌ NEVER validate against production

**Prerequisites:**

```bash
# 1. Start LOCAL dev environment
cd fe-next
npm run dev
# Server starts at http://localhost:3001
```

### Level 0: Environment Verification (CRITICAL)

```bash
# Verify local dev server is running
curl http://localhost:3001/api/health
```

**Expected:** `{"status":"ok"}`
**Unsafe:** Connection refused (server not running)

### Level 1: Translation Keys Check

```bash
cd fe-next
npm run check:translations
```

**Expected:** No missing translation keys reported
**Expected:** New keys appear in all 5 language files

### Level 2: TypeScript Compilation

```bash
cd fe-next
npx tsc --noEmit
```

**Expected:** No TypeScript errors
**Expected:** All new interfaces and types compile successfully

### Level 3: Frontend Unit Tests

```bash
cd fe-next
npm run test:frontend
```

**Expected:** All tests pass
**Expected:** Coverage >= 80% for modified files

### Level 4: Specific Test Files

```bash
# Test first letter reveal
npm run test:frontend -- FillBlankChallenge.firstLetter

# Test validator
npm run test:frontend -- placeholderValidator

# Test preview component
npm run test:frontend -- TemplatePreview
```

**Expected:** All tests pass with 0 failures

### Level 5: Linting

```bash
cd fe-next
npm run lint
```

**Expected:** No linting errors
**Expected:** No unused imports or variables

### Level 6: Build

```bash
cd fe-next
npm run build
```

**Expected:** Build completes successfully
**Expected:** No build warnings or errors

### Level 7: Manual Validation (LOCAL MODE)

**Part A - Fill Blank Challenge:**

1. Navigate to `http://localhost:3001/en/daily/buzz`
2. Start a fill blank challenge
3. Verify:
   - First letter box is pre-filled with correct letter
   - First letter box is disabled (cannot edit)
   - First letter has "Hint" label above it
   - Focus starts on second box
   - Typing works from second box onward
   - ArrowLeft from second box does NOT move to first box
   - Backspace from second box clears second box (not first)
4. Test Hebrew (RTL):
   - Navigate to `http://localhost:3001/he/daily/buzz`
   - Verify first letter is rightmost (RTL)
   - Verify hint label is positioned correctly (RTL)

**Part B - Template Editor:**

1. Login as admin at `http://localhost:3001/en/admin`
2. Navigate to Daily Buzz admin panel
3. Click "Prompt Templates" button
4. Click "Edit" on any riddle template
5. Verify:
   - Form loads with current template content
   - Placeholder hints show above textarea
   - Click "Show Preview" button
   - Preview appears with sample data
   - Placeholders are replaced with sample values
   - Replaced values are highlighted
6. Remove required placeholder (e.g., delete `{topic}`):
   - Validation error appears immediately
   - Error shows "Missing required placeholders: topic"
   - Save button is disabled
7. Add placeholder back:
   - Validation error disappears
   - Save button becomes enabled
8. Add unused placeholder (e.g., add `{unused}`):
   - Warning appears: "Unused placeholders detected: unused"
   - Save is still enabled (warning, not error)
9. Save template:
   - Success message appears
   - Template list refreshes with updated content

**All manual validation should be done against LOCAL environment only!**

---

## ACCEPTANCE CRITERIA

**Part A - First Letter Reveal:**

- [ ] First letter of answer is automatically shown in first box
- [ ] First letter box is disabled (cannot be edited)
- [ ] First letter box has visual indicator (hint label)
- [ ] Focus starts on second box (not first)
- [ ] Keyboard navigation skips first box correctly
- [ ] Backspace from second box clears second box (not first)
- [ ] RTL languages (Hebrew) show first letter on rightmost side
- [ ] All unit tests pass
- [ ] Manual testing confirms correct behavior

**Part B - Template Editor UX:**

- [ ] Template preview component renders with sample data
- [ ] Placeholders are replaced correctly in preview
- [ ] Validation detects missing required placeholders
- [ ] Validation detects unused placeholders
- [ ] Validation errors prevent saving
- [ ] Validation warnings allow saving
- [ ] Preview can be toggled (show/hide)
- [ ] Layout is improved with better spacing
- [ ] All unit tests pass
- [ ] Integration tests verify full workflow
- [ ] Manual testing confirms UX improvements

**General:**

- [ ] All translation keys added to 5 languages
- [ ] TypeScript compilation succeeds
- [ ] Linting passes with no errors
- [ ] Build succeeds
- [ ] No regressions in existing functionality
- [ ] Code follows project conventions (Neo-Brutalist design, functional components, etc.)
- [ ] Test coverage >= 80% for new/modified code

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms both features work
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability
- [ ] Translation keys complete in all 5 languages
- [ ] RTL (Hebrew) tested and working
- [ ] Admin template editor tested end-to-end

---

## NOTES

**Design Rationale:**

**Part A - Why auto-reveal first letter?**
- Provides helpful starting point without giving away answer
- Reduces player frustration on very difficult words
- Maintains challenge while improving accessibility
- Common pattern in word games (Wordle shows letter colors, crosswords show intersections)

**Part B - Why these specific UX improvements?**
- **Preview:** Admins need to see how templates render before deploying
- **Validation:** Prevents breaking challenges by accidentally removing required variables
- **Visual feedback:** Clear error states reduce admin mistakes
- **Better layout:** Long templates are hard to edit without proper spacing

**Alternatives considered:**

**Part A:**
- Reveal random letter (rejected: less predictable, confusing)
- Reveal multiple letters (rejected: too easy, removes challenge)
- Reveal letter on hint button click (rejected: user said "automatically")

**Part B:**
- Use Monaco Editor for syntax highlighting (rejected: overkill, large bundle)
- Auto-fix validation errors (rejected: risky, could change intent)
- Real-time AI preview (rejected: expensive, slow)

**Trade-offs:**

**Part A:**
- Trade-off: Easier challenges vs player satisfaction
- Decision: Slight easiness is acceptable for better experience
- Mitigation: Only reveal ONE letter (not multiple)

**Part B:**
- Trade-off: More complex UI vs better admin UX
- Decision: Complexity is worth it for safety (preventing broken templates)
- Mitigation: Keep validation logic simple and fast

**Future Considerations:**

**Part A:**
- Potential improvement: Admin configurable hint level (0-2 letters)
- Potential improvement: Difficulty-based hints (harder = more letters)
- Extension point: Add hint system for other challenge types

**Part B:**
- Potential improvement: Template versioning and rollback
- Potential improvement: A/B testing different templates
- Extension point: Template marketplace/sharing
- Extension point: AI-assisted template generation

**Known Limitations:**

**Part A:**
- Single-letter words have no user input (entire word is hint)
- Two-letter words are very easy (50% revealed)
- Doesn't work for non-fill_blank challenge types

**Part B:**
- Preview uses static sample data (not real trends)
- Validation doesn't check template logic (only placeholders)
- No multi-user editing (concurrent edits could conflict)

**Security Considerations:**

- Template editor is admin-only (RLS policies enforced)
- Validation prevents SQL injection via template variables
- Preview doesn't execute code (only string replacement)
- First letter reveal is client-side only (no sensitive data)
