# Feature: Teacher & Class Management End-to-End Flow

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Complete the teacher and class management feature by adding missing end-to-end flows:
1. **Shareable invite links** - Teachers can share direct URLs (e.g., `/join/ABC123`) instead of just codes
2. **Navigation/discoverability** - Clear buttons and links to guide users through the complete flow
3. **Practice-to-game integration** - Students can launch games from their lesson practice view using lesson vocabulary

The core infrastructure exists (classrooms, lessons, practice sessions, XP system), but the user journey has gaps that prevent end-to-end usage.

## User Story

**As a teacher:**
I want to share a clickable link with my students to join my classroom
So that they can easily join without manually typing a 6-character code

**As a student:**
I want to navigate easily between joining classrooms, practicing vocabulary, and playing games
So that I have a seamless learning experience

## Problem Statement

The teacher/class management system has comprehensive backend infrastructure but lacks:
1. No shareable invite link (teachers can only share codes that students must manually enter)
2. Poor navigation - students must know to go to `/student/join` manually
3. Practice-to-game disconnect - students can practice but can't launch games with lesson vocabulary from their view

## Solution Statement

1. Add `/join/[code]` dynamic route that accepts classroom codes in URL and auto-fills the join form
2. Add navigation improvements: header links, teacher dashboard invite link copy, student dashboard join button
3. Add "Play Game" button to student lesson view that launches multiplayer with lesson vocabulary

## Feature Metadata

**Feature Type:** Enhancement
**Estimated Complexity:** Medium (multiple components, some integration)
**Primary Systems Affected:** Frontend routes, teacher/student dashboards, multiplayer integration
**Dependencies:** None (uses existing infrastructure)

---

## CONTEXT REFERENCES

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

**Student Join Flow:**
- `app/[locale]/student/join/page.tsx` (lines 1-49)
  - **WHY:** Current join page - requires auth, renders JoinClassroomForm
  - **PATTERN:** Uses useAuth for auth check, redirects if not authenticated

- `components/student/JoinClassroomForm.tsx` (lines 1-206)
  - **WHY:** The join form component - validates 6-char code, submits via hook
  - **PATTERN:** Uses useJoinClassroom hook, toast notifications, RTL support
  - **KEY:** Currently has no URL parameter handling - needs to accept `?code=ABC123`

**Teacher Dashboard:**
- `components/teacher/ClassroomManager.tsx` (lines 88-91, 161-177)
  - **WHY:** Shows join code in classroom cards, has copy button
  - **PATTERN:** Uses navigator.clipboard.writeText, toast for success
  - **KEY:** Need to add "Copy Invite Link" in addition to "Copy Code"

- `components/teacher/ClassroomStudentList.tsx` (lines 60-73)
  - **WHY:** Empty state shows hint to share join code
  - **KEY:** Could enhance with shareable link hint

**Student Dashboard:**
- `app/[locale]/student/page.tsx` (lines 1-67)
  - **WHY:** Main student dashboard, renders StudentLessonView
  - **PATTERN:** Auth check, Header component, max-w-7xl layout

- `components/student/StudentLessonView.tsx` (lines 86-110, 240-255)
  - **WHY:** Shows lessons with action buttons, empty state has "Join Classroom" button
  - **PATTERN:** Router navigation, button styling with neo-brutalist design
  - **KEY:** Action buttons go to practice, need to add game launch option

**Practice-to-Game Integration:**
- `components/teacher/LessonBuilder.tsx` (lines 72-97)
  - **WHY:** Teacher's "Start Game" button - stores lesson data in sessionStorage, navigates to multiplayer
  - **PATTERN:** `sessionStorage.setItem('lessonGameData', JSON.stringify({...}))`, then `router.push('/${language}/multiplayer?fromLesson=true')`
  - **KEY:** This exact pattern should be reused for student lesson view

- `app/[locale]/multiplayer/page.tsx` (lines 262-277)
  - **WHY:** Reads `fromLesson` URL param and `lessonGameData` from sessionStorage
  - **PATTERN:** Already handles lesson data loading, sets room language

**Translations:**
- `translations/en.js` (lines 4255-4274)
  - **WHY:** Has `education.student.join.*` translations
  - **KEY:** Need to add new translations for invite link, play game, etc.

### New Files to Create

- `app/[locale]/join/[code]/page.tsx` - Dynamic route for shareable invite links

### Files to Modify

- `components/student/JoinClassroomForm.tsx` - Accept initial code from props/URL
- `components/teacher/ClassroomManager.tsx` - Add "Copy Invite Link" button
- `components/student/StudentLessonView.tsx` - Add "Play Game" button
- `components/Header.tsx` - Add student join link in navigation (optional)
- `translations/en.js` - Add new translation keys
- `translations/he.js` - Add Hebrew translations
- `translations/sv.js` - Add Swedish translations
- `translations/ja.js` - Add Japanese translations
- `translations/es.js` - Add Spanish translations

### Patterns to Follow

**URL-Based Code Pre-fill Pattern:**
```tsx
// In JoinClassroomForm - accept initialCode prop
interface JoinClassroomFormProps {
  initialCode?: string;
}

const JoinClassroomForm: React.FC<JoinClassroomFormProps> = ({ initialCode }) => {
  const [code, setCode] = useState(initialCode || '');
  // ... rest of component
};
```

**Dynamic Route Page Pattern:**
```tsx
// app/[locale]/join/[code]/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import JoinClassroomForm from '@/components/student/JoinClassroomForm';

export default function JoinWithCodePage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const code = params?.code as string;

  useEffect(() => {
    if (!isAuthenticated) {
      // Redirect to home with return URL
      router.push(`/${language}?returnTo=/join/${code}`);
    }
  }, [isAuthenticated, router, language, code]);

  if (!isAuthenticated) return null;

  return <JoinClassroomForm initialCode={code?.toUpperCase()} />;
}
```

**Copy Invite Link Pattern (from ClassroomManager):**
```tsx
const copyInviteLink = (code: string) => {
  const link = `${window.location.origin}/${language}/join/${code}`;
  navigator.clipboard.writeText(link);
  toast.success(t('teacher.classroom.linkCopied'));
};
```

**Student Start Game Pattern (mirror LessonBuilder.tsx:72-96):**
```tsx
const handleStartGame = (lesson: StudentLessonWithProgress) => {
  // Get vocabulary words that can be integrated
  const vocabularyWords = (lesson.lesson?.words || [])
    .filter((w) => w.canIntegrate)
    .map((w) => w.word);

  // Store lesson info in sessionStorage
  sessionStorage.setItem('lessonGameData', JSON.stringify({
    lessonId: lesson.lessonId,
    lessonName: lesson.lesson?.name || 'Practice Game',
    vocabularyWords,
    language: lesson.lesson?.language || language,
  }));

  // Navigate to multiplayer with lesson flag
  router.push(`/${language}/multiplayer?fromLesson=true`);
};
```

---

## IMPLEMENTATION PLAN

### Phase 1: Shareable Invite Link Route

Create the `/join/[code]` dynamic route that:
- Accepts classroom code as URL parameter
- Handles auth check (redirect to login if not authenticated)
- Passes code to JoinClassroomForm as initial value

### Phase 2: JoinClassroomForm Enhancement

Modify the form to:
- Accept an optional `initialCode` prop
- Pre-fill the input field when prop is provided
- Auto-submit or highlight the submit button when code is pre-filled

### Phase 3: Teacher Dashboard - Copy Invite Link

Add to ClassroomManager:
- "Copy Invite Link" button alongside "Copy Code"
- Generate full URL with locale: `/{locale}/join/{code}`
- Toast notification on successful copy

### Phase 4: Student Lesson View - Play Game Button

Add to StudentLessonView:
- "Play Game" button next to practice button for lessons with integrated words
- Use same pattern as teacher's LessonBuilder
- Store lesson data in sessionStorage, navigate to multiplayer

### Phase 5: Translations

Add translation keys for all 5 languages:
- `teacher.classroom.copyLink` - "Copy Invite Link"
- `teacher.classroom.linkCopied` - "Invite link copied!"
- `student.lessons.playGame` - "Play Game"
- `student.lessons.playGameTooltip` - "Start a multiplayer game with this vocabulary"

---

## STEP-BY-STEP TASKS

**IMPORTANT:** Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 1: CREATE `app/[locale]/join/[code]/page.tsx`

- **IMPLEMENT:** Dynamic route page that accepts classroom code from URL
- **PATTERN:** Mirror `app/[locale]/student/join/page.tsx` for auth handling
- **IMPORTS:**
  ```tsx
  import { useParams, useRouter } from 'next/navigation';
  import { useEffect, useState } from 'react';
  import { useAuth } from '@/contexts/AuthContext';
  import { useLanguage } from '@/contexts/LanguageContext';
  import { NeoLoader } from '@/components/ui/NeoLoader';
  import JoinClassroomForm from '@/components/student/JoinClassroomForm';
  ```
- **GOTCHA:**
  - Code must be uppercase (classroom codes are stored uppercase)
  - Handle case where code is invalid format gracefully
  - Need to handle unauthenticated users - redirect to login with return URL
- **VALIDATE:** Navigate to `/{locale}/join/ABC123` and verify form shows with code pre-filled

### Task 2: UPDATE `components/student/JoinClassroomForm.tsx`

- **IMPLEMENT:** Add `initialCode` prop, use it to pre-fill the code input
- **PATTERN:** Standard React prop with default empty string
- **CHANGES:**
  1. Add interface with optional `initialCode` prop
  2. Initialize `code` state with `initialCode || ''`
  3. Optionally: auto-focus submit button when initialCode is provided
- **GOTCHA:** Don't auto-submit - user should confirm by clicking button
- **VALIDATE:** Render `<JoinClassroomForm initialCode="ABC123" />` and verify input is pre-filled

### Task 3: UPDATE `components/teacher/ClassroomManager.tsx`

- **IMPLEMENT:** Add "Copy Invite Link" button next to existing "Copy Code" button
- **PATTERN:** Mirror existing `copyJoinCode` function
- **CHANGES:**
  1. Add `copyInviteLink` function that creates full URL
  2. Add second button in the join code section with Link icon
  3. Add tooltip for clarity
- **IMPORTS:** Add `Link2` from lucide-react
- **GOTCHA:** Must use `window.location.origin` to get correct domain, include locale in path
- **VALIDATE:** Click "Copy Invite Link", paste in browser, verify URL goes to join page

### Task 4: UPDATE `components/student/StudentLessonView.tsx`

- **IMPLEMENT:** Add "Play Game" button for lessons that have integrated vocabulary words
- **PATTERN:** Mirror `components/teacher/LessonBuilder.tsx:72-96` for sessionStorage + navigation
- **CHANGES:**
  1. Add `handleStartGame` function
  2. Add "Play Game" button alongside existing practice button
  3. Only show if lesson has words with `canIntegrate: true`
- **IMPORTS:** Add `Gamepad2` from lucide-react
- **GOTCHA:**
  - Check `lesson.words.some(w => w.canIntegrate)` before showing button
  - Use same `lessonGameData` sessionStorage key as teacher
- **VALIDATE:** Click "Play Game" on lesson, verify navigates to multiplayer with lesson data

### Task 5: UPDATE `translations/en.js`

- **IMPLEMENT:** Add new translation keys for invite link and play game features
- **PATTERN:** Follow existing nested structure under `education`
- **CHANGES:** Add to `education.teacher.classroom`:
  ```js
  "copyLink": "Copy Invite Link",
  "linkCopied": "Invite link copied to clipboard!"
  ```
  Add to `education.student.lessons`:
  ```js
  "playGame": "Play Game",
  "playGameHint": "Practice with a multiplayer game"
  ```
- **VALIDATE:** Search for keys in code, verify they're used correctly

### Task 6: UPDATE `translations/he.js`

- **IMPLEMENT:** Add Hebrew translations for new keys
- **TRANSLATIONS:**
  - "copyLink": "העתק קישור הזמנה"
  - "linkCopied": "קישור ההזמנה הועתק!"
  - "playGame": "שחק משחק"
  - "playGameHint": "תרגל במשחק מרובה משתתפים"
- **VALIDATE:** Switch to Hebrew, verify translations appear

### Task 7: UPDATE `translations/sv.js`

- **IMPLEMENT:** Add Swedish translations for new keys
- **TRANSLATIONS:**
  - "copyLink": "Kopiera inbjudningslänk"
  - "linkCopied": "Inbjudningslänken har kopierats!"
  - "playGame": "Spela spel"
  - "playGameHint": "Öva med ett multiplayer-spel"
- **VALIDATE:** Switch to Swedish, verify translations appear

### Task 8: UPDATE `translations/ja.js`

- **IMPLEMENT:** Add Japanese translations for new keys
- **TRANSLATIONS:**
  - "copyLink": "招待リンクをコピー"
  - "linkCopied": "招待リンクがコピーされました！"
  - "playGame": "ゲームで遊ぶ"
  - "playGameHint": "マルチプレイヤーゲームで練習"
- **VALIDATE:** Switch to Japanese, verify translations appear

### Task 9: UPDATE `translations/es.js`

- **IMPLEMENT:** Add Spanish translations for new keys
- **TRANSLATIONS:**
  - "copyLink": "Copiar enlace de invitación"
  - "linkCopied": "¡Enlace de invitación copiado!"
  - "playGame": "Jugar"
  - "playGameHint": "Practica con un juego multijugador"
- **VALIDATE:** Switch to Spanish, verify translations appear

### Task 10: CREATE Unit Tests

- **IMPLEMENT:** Tests for new join route and updated components
- **PATTERN:** Follow existing test patterns in `__tests__/`
- **FILES:**
  - `app/[locale]/join/[code]/__tests__/page.test.tsx` - Test route handling
  - Update existing `JoinClassroomForm` tests if any
- **VALIDATE:** `npm run test:frontend` passes

---

## TESTING STRATEGY

### Unit Tests

**Scope and Requirements:**
- Test JoinClassroomForm with initialCode prop
- Test copyInviteLink function generates correct URL
- Test handleStartGame stores correct sessionStorage data

**Pattern:**
```typescript
describe('JoinClassroomForm', () => {
  it('should pre-fill code when initialCode prop is provided', () => {
    render(<JoinClassroomForm initialCode="ABC123" />);
    const input = screen.getByLabelText(/code/i);
    expect(input).toHaveValue('ABC123');
  });
});

describe('ClassroomManager', () => {
  it('should copy invite link with correct format', async () => {
    const writeText = jest.fn();
    Object.assign(navigator, { clipboard: { writeText } });

    // ... render and click

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/join/'));
  });
});
```

### Integration Tests

**Scope:**
- Full flow: Teacher creates classroom → copies invite link → student uses link to join
- Full flow: Student views lesson → clicks Play Game → multiplayer loads with lesson data

### Manual Testing Checklist

- [ ] Create classroom as teacher, verify join code displays
- [ ] Click "Copy Invite Link", paste URL, verify it's correct format
- [ ] Open invite link in incognito (logged out), verify redirect to login
- [ ] Open invite link logged in, verify code pre-filled in form
- [ ] Submit join form with pre-filled code, verify success
- [ ] View student lessons, verify "Play Game" button appears for lessons with vocab
- [ ] Click "Play Game", verify multiplayer page loads with lesson data
- [ ] Test in Hebrew (RTL), Swedish, Japanese, Spanish - verify translations

---

## VALIDATION COMMANDS

### Level 1: TypeScript Compilation

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run build 2>&1 | head -100
```

**Expected:** Build succeeds with no TypeScript errors

### Level 2: Lint Check

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run lint
```

**Expected:** No linting errors

### Level 3: Unit Tests

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run test:frontend -- --testPathPattern="join|JoinClassroom|ClassroomManager|StudentLessonView"
```

**Expected:** All related tests pass

### Level 4: Full Test Suite

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run test
```

**Expected:** All tests pass

### Level 5: Manual E2E Verification

```bash
# Start dev server
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run dev

# Test URLs (open in browser):
# - http://localhost:3000/en/join/ABC123 (should show join form with code)
# - http://localhost:3000/en/teacher (create classroom, copy link)
# - http://localhost:3000/en/student (view lessons, click Play Game)
```

---

## ACCEPTANCE CRITERIA

- [ ] `/join/[code]` route exists and pre-fills join form with code
- [ ] Teacher dashboard has "Copy Invite Link" button that generates shareable URL
- [ ] Student lesson view has "Play Game" button that launches multiplayer with lesson vocab
- [ ] All 5 languages have translations for new UI text
- [ ] Build passes with no errors
- [ ] All tests pass
- [ ] Manual testing confirms full E2E flow works

---

## COMPLETION CHECKLIST

- [ ] Task 1: Created join/[code] dynamic route
- [ ] Task 2: Updated JoinClassroomForm with initialCode prop
- [ ] Task 3: Added Copy Invite Link to ClassroomManager
- [ ] Task 4: Added Play Game button to StudentLessonView
- [ ] Task 5-9: All translations added
- [ ] Task 10: Tests written and passing
- [ ] Build passes
- [ ] Lint passes
- [ ] Manual E2E verification complete

---

## NOTES

### Design Rationale

**Why URL-based join instead of QR code?**
- QR codes add complexity (library, generation, display)
- URLs work on all devices, can be shared via any channel
- Teachers can easily share links in Zoom chat, email, etc.
- QR can be added as future enhancement

**Why sessionStorage for lesson game data?**
- Matches existing pattern from teacher LessonBuilder
- Avoids URL parameter complexity (long URLs)
- Cleared on tab close (no stale data)
- Already handled by multiplayer page

### Future Considerations

- **QR Code Generation:** Could add QR display next to invite link
- **Email Invites:** Send invite links directly to students
- **Deep Linking:** Save return URL before auth redirect
- **Practice Requirement:** Optionally require X% mastery before allowing game
