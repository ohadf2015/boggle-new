# Feature: Israeli School Compliance - Accessibility, Privacy, Teacher Dashboard, Progress Reports, Curriculum Word Lists

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Comprehensive compliance package for Israeli Ministry of Education school deployment including:
1. **Accessibility Audit & Fixes** - WCAG 2.0 AA compliance per Israeli Standard ת"י 5568
2. **Privacy Policy Updates** - Hebrew privacy policy with parental consent for minors
3. **Teacher Dashboard Enhancements** - Progress reports, analytics, CSV/PDF export
4. **Curriculum-Aligned Word Lists** - Hebrew grade-level vocabulary per Israeli curriculum

## User Story

```
As a school administrator in Israel
I want LexiClash to meet Ministry of Education requirements
So that we can use it in classrooms with proper compliance

As a teacher in an Israeli school
I want to see student progress reports aligned with curriculum
So that I can track vocabulary mastery and report to parents

As a student with disabilities
I want the game to be fully accessible
So that I can participate equally with my classmates
```

## Problem Statement

LexiClash needs to meet Israeli Ministry of Education requirements to be approved for school use:
- Accessibility gaps prevent WCAG 2.0 AA compliance (required by ת"י 5568)
- Privacy policy lacks Hebrew translation and parental consent mechanism
- Teacher dashboard exists but lacks progress reports and curriculum alignment
- No grade-level word lists aligned with Israeli Hebrew curriculum

## Solution Statement

Implement a phased compliance package:
1. Fix critical accessibility gaps (skip links, form accessibility, landmarks)
2. Add Hebrew privacy policy with parental consent flow
3. Enhance teacher dashboard with progress reports and PDF export
4. Create curriculum-aligned Hebrew word lists by grade level

## Feature Metadata

**Feature Type:** Enhancement (multiple existing features improved for compliance)
**Estimated Complexity:** High (multi-component, cross-cutting changes)
**Primary Systems Affected:**
- Frontend: Components, App Router pages, translations
- Backend: API routes, Supabase queries
- Database: New tables for curriculum and consent
**Dependencies:**
- Existing teacher dashboard (`/teacher/`)
- Existing accessibility infrastructure (Radix UI, ARIA)
- Translation system (4 languages)

---

## CONTEXT REFERENCES

### Prime Context (READ THIS FIRST!)

- `fe-next/CLAUDE.md` - Complete project standards and patterns
  - **WHY:** Contains design system (neo-brutalist), translation requirements, testing mandates
  - **ACTION:** Read before any implementation

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

#### Accessibility Files
- `fe-next/hooks/useFocusTrap.ts` - Focus trap implementation
  - **WHY:** Pattern for modal focus management
  - **PATTERN:** Custom hook with ref-based focus cycling

- `fe-next/hooks/useModalAccessibility.ts` - Modal accessibility hook
  - **WHY:** Escape key, focus trap, focus restoration pattern
  - **PATTERN:** Combines multiple accessibility concerns

- `fe-next/utils/mobileAccessibility.ts` - Touch target utilities
  - **WHY:** 44px min touch targets, safe area handling
  - **PATTERN:** Constants and utility functions

- `fe-next/contexts/GameAnnouncerContext.tsx` - Screen reader announcements
  - **WHY:** Live region management for dynamic content
  - **PATTERN:** Context provider with polite/assertive levels

#### Teacher Dashboard Files
- `fe-next/lib/supabase/teacher.ts` (1,095 lines) - All teacher queries
  - **WHY:** Classroom, lesson, progress CRUD operations
  - **PATTERN:** Async functions with Supabase client

- `fe-next/lib/supabase/analytics.ts` (~360 lines) - Analytics queries
  - **WHY:** Student metrics, classroom analytics
  - **PATTERN:** Metrics calculation with SQL queries

- `fe-next/components/teacher/StudentProgressView.tsx` - CSV export
  - **WHY:** Existing progress export pattern
  - **PATTERN:** Component with download functionality

- `fe-next/app/[locale]/teacher/classroom/[id]/analytics/PageClient.tsx`
  - **WHY:** Analytics dashboard implementation
  - **PATTERN:** Real-time updates, metric cards

#### Privacy & Legal Files
- `fe-next/app/[locale]/legal/privacy/PageClient.tsx` - Privacy policy page
  - **WHY:** Existing privacy policy structure
  - **PATTERN:** Translated sections with LegalPageLayout

- `fe-next/components/legal/LegalPageLayout.tsx` - Shared legal layout
  - **WHY:** Consistent footer, RTL support
  - **PATTERN:** Wrapper component with navigation

- `fe-next/translations/en.js` - English translations
  - **WHY:** Translation structure pattern
  - **PATTERN:** Nested object with `t('key.subkey')` access

#### Database Schemas
- `fe-next/supabase/migrations/056_teacher_vocabulary_builder.sql`
  - **WHY:** Classroom, lesson, progress schema
  - **PATTERN:** PostgreSQL with RLS policies

- `fe-next/supabase/migrations/062_education_xp_tracking.sql`
  - **WHY:** XP, level, streak tracking
  - **PATTERN:** Triggers for auto-calculation

#### Word Lists
- `fe-next/utils/dailyChallenge/wordLists.ts` - Curated word lists
  - **WHY:** Current word list structure per language
  - **PATTERN:** Exported objects by language

- `fe-next/backend/dictionary.ts` - Dictionary singleton
  - **WHY:** Word validation, language normalization
  - **PATTERN:** Lazy loading, Hebrew finals normalization

### New Files to Create

```
fe-next/
├── components/
│   ├── accessibility/
│   │   ├── SkipLink.tsx                    # Skip to main content link
│   │   ├── SkipLinks.tsx                   # Skip links container
│   │   └── __tests__/SkipLink.test.tsx
│   ├── consent/
│   │   ├── ParentalConsentBanner.tsx       # COPPA/GDPR consent banner
│   │   ├── ParentalConsentModal.tsx        # Full consent flow
│   │   └── __tests__/ParentalConsentBanner.test.tsx
│   └── teacher/
│       ├── reports/
│       │   ├── ProgressReportPDF.tsx       # PDF generation component
│       │   ├── ClassProgressReport.tsx     # Class-wide report view
│       │   └── StudentProgressReport.tsx   # Individual student report
│       └── curriculum/
│           ├── CurriculumWordListSelector.tsx  # Grade/topic selector
│           └── GradeLevelBadge.tsx             # Visual grade indicator
├── data/
│   └── curriculum/
│       ├── he/
│       │   ├── grade1.json                 # כיתה א׳ word list
│       │   ├── grade2.json                 # כיתה ב׳ word list
│       │   ├── grade3.json                 # כיתה ג׳ word list
│       │   ├── grade4.json                 # כיתה ד׳ word list
│       │   ├── grade5.json                 # כיתה ה׳ word list
│       │   └── grade6.json                 # כיתה ו׳ word list
│       └── index.ts                        # Curriculum word list loader
├── hooks/
│   ├── useSkipLink.ts                      # Skip link scroll/focus
│   └── useParentalConsent.ts               # Consent state management
├── app/[locale]/
│   └── teacher/
│       └── classroom/[id]/
│           └── reports/
│               ├── page.tsx                # Progress reports page
│               └── PageClient.tsx          # Reports dashboard
└── supabase/migrations/
    └── 068_parental_consent_tracking.sql   # Consent records table
```

### Relevant Documentation (MUST READ!)

- [WCAG 2.0 AA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/?levels=aaa)
  - **Section:** Keyboard, Focus, Forms, Structure
  - **WHY:** Israeli Standard ת"י 5568 is based on WCAG 2.0 AA

- [Israeli Accessibility Requirements](https://sapakim.education.gov.il/accessibility/tech-adjustments/)
  - **Section:** Web applications, Digital documents
  - **WHY:** Ministry of Education specific requirements

- [React-PDF Documentation](https://react-pdf.org/)
  - **Section:** Document, Page, Text components
  - **WHY:** PDF generation for progress reports

### Patterns to Follow

**Accessibility Skip Link Pattern:**
```tsx
// ✅ GOOD: Skip link with focus management
export function SkipLink({ targetId, children }: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus();
      target.removeAttribute('tabindex');
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
                 focus:z-50 focus:bg-neo-yellow focus:text-black focus:p-3
                 focus:rounded-neo focus:border-neo focus:shadow-hard"
    >
      {children}
    </a>
  );
}
```

**Form Accessibility Pattern:**
```tsx
// ✅ GOOD: Accessible form field with error linking
<div>
  <label htmlFor="email" id="email-label">
    {t('form.email')}
    <span className="sr-only">{t('form.required')}</span>
  </label>
  <input
    id="email"
    type="email"
    aria-labelledby="email-label"
    aria-describedby={error ? 'email-error' : 'email-hint'}
    aria-invalid={!!error}
    aria-required="true"
  />
  {error && (
    <span id="email-error" role="alert" className="text-neo-pink">
      {error}
    </span>
  )}
  <span id="email-hint" className="sr-only">
    {t('form.emailHint')}
  </span>
</div>
```

**Translation Pattern:**
```tsx
// ✅ GOOD: Using t() for all text
const { t } = useLanguage();
return <h1>{t('teacher.reports.title')}</h1>;
```

**PDF Generation Pattern:**
```tsx
// ✅ GOOD: React-PDF document structure
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Rubik' },
  title: { fontSize: 24, marginBottom: 20 },
});

export function ProgressReportPDF({ data }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{data.studentName}</Text>
        {/* ... */}
      </Page>
    </Document>
  );
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Accessibility Audit & Critical Fixes

**Objective:** Achieve WCAG 2.0 AA compliance for Israeli Standard ת"י 5568

**Tasks:**
1. Add skip navigation links
2. Add semantic landmarks (main, nav, header, footer)
3. Fix form accessibility (aria-invalid, aria-describedby)
4. Add focus management for dynamic content
5. Fix color contrast issues (if light mode supported)

**Order:** These are foundational accessibility fixes required before other features.

### Phase 2: Privacy Policy & Parental Consent

**Objective:** GDPR/PPL compliance with Hebrew privacy policy and consent tracking

**Tasks:**
1. Add Hebrew privacy policy content to translations
2. Create parental consent banner/modal
3. Create consent tracking database table
4. Implement consent API endpoints
5. Gate features behind consent for minors

**Order:** Privacy compliance is a legal requirement; implement after accessibility.

### Phase 3: Teacher Dashboard Progress Reports

**Objective:** Comprehensive progress reporting for teachers

**Tasks:**
1. Create progress report page and components
2. Implement PDF generation with react-pdf
3. Add individual student report view
4. Add class-wide summary report
5. Add export functionality (PDF, CSV)

**Order:** Builds on existing teacher dashboard; implement after privacy.

### Phase 4: Curriculum-Aligned Word Lists

**Objective:** Hebrew vocabulary aligned with Israeli education curriculum

**Tasks:**
1. Research and create grade-level word lists (grades 1-6)
2. Create curriculum word list data structure
3. Implement curriculum selector in lesson builder
4. Add grade-level indicators in UI
5. Integrate with existing word validation

**Order:** Final feature; depends on teacher dashboard.

---

## STEP-BY-STEP TASKS

**IMPORTANT:** Execute every task in order, top to bottom. Each task is atomic and independently testable.

---

### PHASE 1: ACCESSIBILITY

#### Task 1.1: CREATE `components/accessibility/SkipLink.tsx`

- **IMPLEMENT:** Skip link component that jumps to main content
- **PATTERN:** Reference `hooks/useFocusTrap.ts` for focus management
- **IMPORTS:**
  ```tsx
  import { useLanguage } from '@/contexts/LanguageContext';
  ```
- **GOTCHA:** Must be first focusable element in DOM; visible only on focus
- **VALIDATE:** `npm run test -- --testPathPattern=SkipLink`

```tsx
// Expected implementation:
// - sr-only by default, visible on :focus
// - Click/Enter jumps to #main-content
// - Programmatically sets focus on target
// - Uses t('accessibility.skipToMain') for label
```

#### Task 1.2: CREATE `components/accessibility/__tests__/SkipLink.test.tsx`

- **IMPLEMENT:** Unit tests for SkipLink
- **PATTERN:** Reference `components/auth/__tests__/` for test structure
- **TEST CASES:**
  - Renders with sr-only class by default
  - Becomes visible on focus
  - Clicking moves focus to target element
  - Keyboard Enter activates link
- **VALIDATE:** `npm run test -- --testPathPattern=SkipLink`

#### Task 1.3: UPDATE `app/[locale]/layout.tsx` - Add Skip Links

- **IMPLEMENT:** Add SkipLink as first element in body
- **PATTERN:** Layout component pattern from existing code
- **IMPORTS:** `import { SkipLink } from '@/components/accessibility/SkipLink';`
- **GOTCHA:** Must be before header in DOM order
- **VALIDATE:** Manual: Tab into page, verify skip link appears

#### Task 1.4: UPDATE `app/[locale]/layout.tsx` - Add Landmarks

- **IMPLEMENT:** Add semantic landmarks
- **CHANGES:**
  ```tsx
  <header role="banner">...</header>
  <main id="main-content" role="main">...</main>
  <footer role="contentinfo">...</footer>
  ```
- **GOTCHA:** Only one `<main>` per page
- **VALIDATE:** Browser accessibility tree inspection

#### Task 1.5: CREATE `hooks/useAriaLive.ts`

- **IMPLEMENT:** Hook for managing aria-live announcements
- **PATTERN:** Reference `contexts/GameAnnouncerContext.tsx`
- **API:**
  ```tsx
  const { announce } = useAriaLive();
  announce('Word submitted successfully', 'polite');
  ```
- **VALIDATE:** `npm run test -- --testPathPattern=useAriaLive`

#### Task 1.6: UPDATE `components/ui/FormField.tsx` - Accessibility Enhancement

- **IMPLEMENT:** Add aria-invalid, aria-describedby, aria-required
- **PATTERN:** Follow accessible form pattern from Context References
- **CHANGES:**
  - Add `aria-invalid={!!error}`
  - Add `aria-describedby` linking to error/hint
  - Add `aria-required` when field is required
  - Add `role="alert"` to error messages
- **VALIDATE:** `npm run test -- --testPathPattern=FormField`

#### Task 1.7: CREATE `components/accessibility/SkipLinks.tsx` - Multiple Skip Links

- **IMPLEMENT:** Container for multiple skip links (main, navigation, search)
- **PATTERN:** Extend SkipLink component
- **TARGETS:**
  - Skip to main content
  - Skip to navigation
  - Skip to search (if present)
- **VALIDATE:** Manual keyboard navigation test

---

### PHASE 2: PRIVACY POLICY & CONSENT

#### Task 2.1: UPDATE `translations/en.js` - Add Parental Consent Keys

- **IMPLEMENT:** Add consent-related translation keys
- **KEYS TO ADD:**
  ```javascript
  consent: {
    title: "Parental Consent Required",
    description: "This educational game collects progress data...",
    parentEmail: "Parent/Guardian Email",
    childAge: "Child's Age",
    agreeTerms: "I consent to data collection for educational purposes",
    submit: "Submit Consent",
    privacyLink: "Read our Privacy Policy",
    minorNotice: "Users under 14 require parental consent"
  }
  ```
- **VALIDATE:** `npm run test -- --testPathPattern=translations`

#### Task 2.2: UPDATE `translations/he.js` - Hebrew Consent & Privacy

- **IMPLEMENT:** Hebrew translations for consent and enhanced privacy policy
- **GOTCHA:** RTL text direction, Hebrew legal terminology
- **VALIDATE:** Manual: View with `?locale=he`

#### Task 2.3: CREATE `supabase/migrations/068_parental_consent_tracking.sql`

- **IMPLEMENT:** Database table for consent records
- **SCHEMA:**
  ```sql
  CREATE TABLE parental_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_email TEXT NOT NULL,
    child_birth_year INTEGER NOT NULL,
    consent_given_at TIMESTAMPTZ DEFAULT NOW(),
    consent_version TEXT NOT NULL DEFAULT '1.0',
    ip_address TEXT,
    user_agent TEXT,
    revoked_at TIMESTAMPTZ,
    UNIQUE(user_id)
  );

  -- RLS policies
  ALTER TABLE parental_consents ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can view own consent"
    ON parental_consents FOR SELECT
    USING (auth.uid() = user_id);
  ```
- **VALIDATE:** `npm run db:migrate` (local dev)

#### Task 2.4: CREATE `hooks/useParentalConsent.ts`

- **IMPLEMENT:** Hook to check and manage consent state
- **API:**
  ```tsx
  const {
    needsConsent,
    hasConsent,
    requestConsent,
    consentData
  } = useParentalConsent();
  ```
- **PATTERN:** Reference `hooks/useAuth.ts` for auth-aware hooks
- **VALIDATE:** `npm run test -- --testPathPattern=useParentalConsent`

#### Task 2.5: CREATE `components/consent/ParentalConsentBanner.tsx`

- **IMPLEMENT:** Dismissible banner prompting for consent
- **PATTERN:** Reference `components/CrazyGamesBanner.tsx` for banner pattern
- **PROPS:**
  ```tsx
  interface Props {
    onRequestConsent: () => void;
    onDismiss: () => void;
  }
  ```
- **VALIDATE:** `npm run test -- --testPathPattern=ParentalConsentBanner`

#### Task 2.6: CREATE `components/consent/ParentalConsentModal.tsx`

- **IMPLEMENT:** Full consent form modal
- **FIELDS:**
  - Parent email (required)
  - Child birth year (dropdown)
  - Consent checkbox with terms link
  - Privacy policy link
- **PATTERN:** Reference `components/multiplayer/CreateRoomModal.tsx` for modal pattern
- **ACCESSIBILITY:** Focus trap, escape to close, aria-labelledby
- **VALIDATE:** `npm run test -- --testPathPattern=ParentalConsentModal`

#### Task 2.7: CREATE `backend/routes/consent.ts`

- **IMPLEMENT:** API endpoints for consent management
- **ENDPOINTS:**
  - `POST /api/consent` - Submit consent
  - `GET /api/consent` - Check consent status
  - `DELETE /api/consent` - Revoke consent
- **PATTERN:** Reference `backend/routes/admin.ts` for route structure
- **VALIDATE:** `npm run test:backend -- consent`

---

### PHASE 3: TEACHER DASHBOARD PROGRESS REPORTS

#### Task 3.1: UPDATE `translations/en.js` - Report Translation Keys

- **IMPLEMENT:** Add progress report translation keys
- **KEYS TO ADD:**
  ```javascript
  teacher: {
    reports: {
      title: "Progress Reports",
      classReport: "Class Progress Report",
      studentReport: "Student Progress Report",
      exportPDF: "Export PDF",
      exportCSV: "Export CSV",
      dateRange: "Date Range",
      metrics: {
        wordsLearned: "Words Learned",
        accuracy: "Accuracy",
        practiceTime: "Practice Time",
        streak: "Current Streak"
      }
    }
  }
  ```
- **VALIDATE:** `npm run test -- --testPathPattern=translations`

#### Task 3.2: INSTALL `@react-pdf/renderer` Dependency

- **IMPLEMENT:** Add react-pdf for PDF generation
- **COMMAND:** `npm install @react-pdf/renderer`
- **GOTCHA:** May need `@react-pdf/font` for Hebrew support
- **VALIDATE:** `npm run build` succeeds

#### Task 3.3: CREATE `components/teacher/reports/ProgressReportPDF.tsx`

- **IMPLEMENT:** PDF document component for progress reports
- **PATTERN:** React-PDF document structure
- **FEATURES:**
  - School logo placeholder
  - Student info header
  - Metrics summary
  - Word mastery table
  - Date range footer
- **GOTCHA:** Hebrew RTL in PDFs requires special font loading
- **VALIDATE:** Visual: Generate sample PDF

#### Task 3.4: CREATE `components/teacher/reports/StudentProgressReport.tsx`

- **IMPLEMENT:** Individual student progress report view
- **DATA:**
  - Words learned vs. total
  - Accuracy percentage
  - Practice sessions count
  - Streak information
  - Word-by-word breakdown
- **PATTERN:** Reference `components/teacher/analytics/StudentProgressTable.tsx`
- **VALIDATE:** `npm run test -- --testPathPattern=StudentProgressReport`

#### Task 3.5: CREATE `components/teacher/reports/ClassProgressReport.tsx`

- **IMPLEMENT:** Class-wide progress summary
- **DATA:**
  - Class average metrics
  - Student ranking table
  - Common mistakes
  - Struggling students list
- **PATTERN:** Reference `lib/supabase/analytics.ts` for queries
- **VALIDATE:** `npm run test -- --testPathPattern=ClassProgressReport`

#### Task 3.6: CREATE `app/[locale]/teacher/classroom/[id]/reports/page.tsx`

- **IMPLEMENT:** Reports page server component
- **PATTERN:** Reference `app/[locale]/teacher/classroom/[id]/analytics/page.tsx`
- **VALIDATE:** Navigate to `/teacher/classroom/{id}/reports`

#### Task 3.7: CREATE `app/[locale]/teacher/classroom/[id]/reports/PageClient.tsx`

- **IMPLEMENT:** Reports dashboard client component
- **FEATURES:**
  - Tab navigation: Class Report | Student Reports
  - Date range selector
  - Export buttons (PDF, CSV)
  - Real-time data refresh
- **VALIDATE:** Manual: Full workflow test

#### Task 3.8: UPDATE `lib/supabase/analytics.ts` - Add Report Queries

- **IMPLEMENT:** New queries for report generation
- **QUERIES:**
  ```typescript
  export async function getStudentReportData(
    studentId: string,
    lessonId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<StudentReportData>

  export async function getClassReportData(
    classroomId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<ClassReportData>
  ```
- **VALIDATE:** `npm run test:backend -- analytics`

---

### PHASE 4: CURRICULUM-ALIGNED WORD LISTS

#### Task 4.1: CREATE `data/curriculum/he/grade1.json`

- **IMPLEMENT:** Hebrew grade 1 (כיתה א׳) word list
- **STRUCTURE:**
  ```json
  {
    "grade": 1,
    "gradeHebrew": "א׳",
    "topics": [
      {
        "name": "family",
        "nameHebrew": "משפחה",
        "words": [
          { "word": "אמא", "definition": "mother" },
          { "word": "אבא", "definition": "father" }
        ]
      }
    ]
  }
  ```
- **GOTCHA:** Include nikud (vowel marks) for young learners
- **VALIDATE:** JSON lint, character encoding check

#### Task 4.2: CREATE `data/curriculum/he/grade2.json` through `grade6.json`

- **IMPLEMENT:** Hebrew word lists for grades 2-6
- **PROGRESSION:**
  - Grade 2: 3-4 letter words, basic verbs
  - Grade 3: 4-5 letter words, past tense
  - Grade 4: 5-6 letter words, compound words
  - Grade 5: 6+ letter words, literary terms
  - Grade 6: Advanced vocabulary, idioms
- **VALIDATE:** `npm run test -- --testPathPattern=curriculum`

#### Task 4.3: CREATE `data/curriculum/index.ts`

- **IMPLEMENT:** Curriculum word list loader
- **API:**
  ```typescript
  export function getCurriculumWords(
    language: 'he' | 'en',
    grade: number,
    topic?: string
  ): CurriculumWord[]

  export function getAvailableGrades(language: string): number[]
  export function getTopicsForGrade(language: string, grade: number): string[]
  ```
- **VALIDATE:** `npm run test -- --testPathPattern=curriculum`

#### Task 4.4: CREATE `components/teacher/curriculum/CurriculumWordListSelector.tsx`

- **IMPLEMENT:** UI for selecting curriculum words
- **FEATURES:**
  - Grade level dropdown
  - Topic checkboxes
  - Word preview list
  - "Add to lesson" button
- **PATTERN:** Reference `components/join/ModeSelector.tsx` for dropdown pattern
- **VALIDATE:** `npm run test -- --testPathPattern=CurriculumWordListSelector`

#### Task 4.5: CREATE `components/teacher/curriculum/GradeLevelBadge.tsx`

- **IMPLEMENT:** Visual badge showing grade level
- **PATTERN:** Reference `components/LevelBadge.tsx`
- **DISPLAY:** "כיתה א׳" / "Grade 1" based on locale
- **VALIDATE:** `npm run test -- --testPathPattern=GradeLevelBadge`

#### Task 4.6: UPDATE `components/teacher/LessonBuilder.tsx` - Curriculum Integration

- **IMPLEMENT:** Add curriculum word list import to lesson builder
- **CHANGES:**
  - Add "Import from Curriculum" button
  - Open CurriculumWordListSelector modal
  - Merge selected words with existing lesson words
- **VALIDATE:** Manual: Full workflow test

#### Task 4.7: UPDATE `translations/en.js` and `translations/he.js` - Curriculum Keys

- **IMPLEMENT:** Add curriculum-related translation keys
- **KEYS:**
  ```javascript
  curriculum: {
    selectGrade: "Select Grade Level",
    selectTopics: "Select Topics",
    addToLesson: "Add to Lesson",
    wordsSelected: "{{count}} words selected",
    gradeLevel: "Grade {{level}}",
    grades: {
      1: "Grade 1 / כיתה א׳",
      2: "Grade 2 / כיתה ב׳",
      // ...
    }
  }
  ```
- **VALIDATE:** `npm run test -- --testPathPattern=translations`

---

## TESTING STRATEGY

### Unit Tests

**Scope and Requirements:**
- Test all new components in isolation
- Test hooks with react-hooks testing library
- Mock Supabase for database queries
- Use Jest + React Testing Library

**Pattern:**
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { SkipLink } from './SkipLink';

describe('SkipLink', () => {
  it('should be hidden by default', () => {
    render(<SkipLink targetId="main">{t('skip')}</SkipLink>);
    expect(screen.getByRole('link')).toHaveClass('sr-only');
  });

  it('should become visible on focus', () => {
    render(<SkipLink targetId="main">{t('skip')}</SkipLink>);
    const link = screen.getByRole('link');
    fireEvent.focus(link);
    expect(link).not.toHaveClass('sr-only');
  });
});
```

### Integration Tests

**Scope and Requirements:**
- Test consent flow end-to-end
- Test PDF generation with real data
- Test curriculum word loading
- Use Playwright for E2E

**Pattern:**
```typescript
test('teacher can generate progress report', async ({ page }) => {
  await page.goto('/teacher/classroom/123/reports');
  await page.click('[data-testid="export-pdf"]');
  // Verify PDF download
});
```

### Accessibility Tests

**Scope and Requirements:**
- Run axe-core on all new pages
- Test keyboard navigation
- Test screen reader announcements
- Test color contrast

**Pattern:**
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

it('should have no accessibility violations', async () => {
  const { container } = render(<SkipLinks />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Edge Cases

- Empty classroom (no students)
- Student with no progress data
- Hebrew RTL in PDF generation
- Consent form with invalid email
- Network failure during consent submission
- Curriculum word with special characters

---

## VALIDATION COMMANDS

**⚠️ CRITICAL SAFETY RULE: ALL validation must be done in LOCAL DEV MODE!**

### Level 0: Environment Verification

```bash
# Verify we're NOT in production
cat .env.local | grep SUPABASE_URL | grep -v "prod" && echo "✅ SAFE: LOCAL mode"
```

### Level 1: Lint & Type Check

```bash
npm run lint
npx tsc --noEmit
```
**Expected:** No errors

### Level 2: Unit Tests

```bash
npm run test -- --testPathPattern="(SkipLink|ParentalConsent|ProgressReport|Curriculum)"
```
**Expected:** All tests pass

### Level 3: Full Test Suite

```bash
npm run test
```
**Expected:** All tests pass, no regressions

### Level 4: Build

```bash
npm run build
```
**Expected:** Build succeeds

### Level 5: Accessibility Audit

```bash
# Run axe-core on dev server
npm run dev &
npx axe http://localhost:3000 --exit
```
**Expected:** No WCAG 2.0 AA violations

### Level 6: Manual Validation

**Accessibility:**
- [ ] Tab through entire page with keyboard only
- [ ] Skip link appears on Tab, jumps to main content
- [ ] All forms announce errors to screen readers
- [ ] Color contrast passes WCAG AA

**Consent:**
- [ ] Banner appears for users under 14
- [ ] Modal submits consent successfully
- [ ] Consent persists across sessions

**Reports:**
- [ ] Class report loads with real data
- [ ] PDF generates and downloads
- [ ] CSV export works
- [ ] Hebrew RTL displays correctly in PDF

**Curriculum:**
- [ ] Grade selector shows all grades
- [ ] Words load for each grade
- [ ] "Add to Lesson" integrates words

---

## ACCEPTANCE CRITERIA

- [ ] Skip link visible on focus, jumps to main content
- [ ] All forms have aria-invalid and aria-describedby
- [ ] Semantic landmarks (main, nav, header, footer) present
- [ ] Hebrew privacy policy content complete
- [ ] Parental consent banner appears for minors
- [ ] Consent data stored in database
- [ ] Progress report page accessible at `/teacher/classroom/{id}/reports`
- [ ] PDF export generates valid document
- [ ] CSV export downloads correctly
- [ ] Hebrew grades 1-6 word lists created
- [ ] Curriculum selector integrates with lesson builder
- [ ] All tests pass (unit, integration, accessibility)
- [ ] Build succeeds with no errors
- [ ] No WCAG 2.0 AA violations

---

## COMPLETION CHECKLIST

- [ ] All Phase 1 tasks completed (Accessibility)
- [ ] All Phase 2 tasks completed (Privacy & Consent)
- [ ] All Phase 3 tasks completed (Progress Reports)
- [ ] All Phase 4 tasks completed (Curriculum Word Lists)
- [ ] All validation commands pass
- [ ] Full test suite passes
- [ ] No lint or type errors
- [ ] Manual testing confirms all features work
- [ ] Hebrew RTL tested thoroughly
- [ ] Acceptance criteria all met

---

## NOTES

### Design Rationale

**Why Skip Links First?**
Skip links are the #1 accessibility requirement for keyboard users. They're also simple to implement and test, making them ideal for Phase 1.

**Why React-PDF?**
React-PDF allows server-side PDF generation with React components, matching our existing component patterns. Alternatives like jsPDF require imperative code.

**Why Curriculum JSON Files?**
JSON files are easy to maintain, version-controlled, and can be loaded dynamically. Future enhancement could move to database for teacher customization.

### Trade-offs

**Parental Consent vs. Anonymous Mode:**
We chose explicit consent over anonymous mode because Israeli schools require accountability. Anonymous mode wouldn't meet Ministry requirements.

**PDF vs. Printable HTML:**
PDF provides consistent formatting across devices and printers. Printable HTML would be simpler but less professional for school reports.

### Future Considerations

- **API Integration:** Ministry SSO integration for schools
- **Advanced Analytics:** Time-series charts, predictive analytics
- **Curriculum Expansion:** More languages, higher grades
- **Offline Mode:** PWA with offline lesson access
- **Bulk Student Import:** CSV upload for class rosters

### Known Limitations

- PDF Hebrew RTL requires custom font loading (may have initial load delay)
- Curriculum word lists are manually curated (not automatically updated)
- Consent mechanism assumes user can provide parent email (no verification)
