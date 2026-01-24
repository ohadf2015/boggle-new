# Phase 13: Translation Completion - Research Report

## Research Question
"What do I need to know to PLAN this phase well?"

## Executive Summary

Phase 13 is a **mechanical translation task** to complete all missing translations for the Phase 11 Teacher Vocabulary Builder feature across 4 non-English languages (Hebrew, Swedish, Japanese, Spanish).

**Key Finding**: All 93 teacher/student keys **already exist** in all 4 target languages. The phase requirements appear to be based on an outdated audit. Current status shows **0 missing keys** for Phase 11 features.

**Recommendation**: Verify phase requirements with user before creating implementation plans.

---

## Current State Analysis

### Translation File Statistics

**Total Keys per Language** (verified identical across all):
- English: 3,041 keys
- Hebrew: 3,041 keys
- Swedish: 3,041 keys
- Japanese: 3,041 keys
- Spanish: 3,041 keys

**Phase 11 Teacher/Student Keys**:
| Section | Keys Count | Status |
|---------|------------|--------|
| `teacher.*` | 67 keys | ✅ Complete in all 4 languages |
| `student.*` | 26 keys | ✅ Complete in all 4 languages |
| **Total** | **93 keys** | **✅ 100% Coverage** |

### Translation Structure

**Files Location**: `/fe-next/translations/`
- `en.js` - English (source of truth)
- `he.js` - Hebrew (RTL)
- `sv.js` - Swedish
- `ja.js` - Japanese
- `es.js` - Spanish

**File Format**: CommonJS modules exporting nested object structures
```javascript
const en = {
  "teacher": {
    "dashboard": { ... },
    "classroom": { ... },
    "lesson": { ... },
    "progress": { ... }
  },
  "student": { ... }
};
module.exports = { en };
```

---

## Phase 11 Feature Scope

### Database Schema (Migration 056)
Tables created for teacher vocabulary feature:
1. **classrooms** - Teacher-created classrooms with join codes
2. **vocabulary_lessons** - Lesson collections with words
3. **classroom_memberships** - Student-classroom relationships
4. **lesson_assignments** - Lesson-classroom assignments
5. **student_lesson_progress** - Student practice tracking

### Component Files Using Translations
Found 11 components using teacher/student translation keys:
1. `components/teacher/TeacherDashboard.tsx`
2. `components/teacher/ClassroomManager.tsx`
3. `components/teacher/LessonBuilder.tsx`
4. `components/teacher/StudentProgressView.tsx`
5. `components/teacher/ClassProgressChart.tsx`
6. `components/student/StudentLessonView.tsx`
7. `components/student/LessonPractice.tsx`
8. `components/multiplayer/HostWordSelector.tsx`
9. `components/singleplayer/SinglePlayerView.tsx`
10. `components/game/WaitingTips.tsx`
11. `components/game/PracticeGridPreview.tsx`

### Translation Key Structure

**Teacher Section (67 keys)**:
```
teacher.accessRequired
teacher.accessDenied
teacher.dashboard.title
teacher.dashboard.classrooms
teacher.dashboard.lessons
teacher.dashboard.students
teacher.dashboard.progress
teacher.classroom.create
teacher.classroom.edit
teacher.classroom.delete
teacher.classroom.confirmDelete
teacher.classroom.name
teacher.classroom.joinCode
teacher.classroom.copyCode
teacher.classroom.codeCopied
teacher.classroom.members
teacher.classroom.member
teacher.classroom.noMembers
teacher.classroom.language
teacher.classroom.created
teacher.classroom.noClassrooms
teacher.classroom.createFirst
teacher.lesson.create
teacher.lesson.edit
teacher.lesson.delete
teacher.lesson.confirmDelete
teacher.lesson.name
teacher.lesson.description
teacher.lesson.words
teacher.lesson.word
teacher.lesson.noWords
teacher.lesson.addWord
teacher.lesson.removeWord
teacher.lesson.wordPlaceholder
teacher.lesson.canIntegrate
teacher.lesson.cannotIntegrate
teacher.lesson.assignToClassroom
teacher.lesson.noClassroomSelected
teacher.lesson.isPublic
teacher.lesson.publicDescription
teacher.lesson.save
teacher.lesson.saving
teacher.lesson.saved
teacher.lesson.noLessons
teacher.lesson.createFirst
teacher.progress.title
teacher.progress.student
teacher.progress.wordsAttempted
teacher.progress.wordsMastered
teacher.progress.accuracy
teacher.progress.lastActive
teacher.progress.noData
teacher.progress.assignLessons
teacher.progress.chartTitle
teacher.progress.wordsLearned
teacher.progress.expandDetails
teacher.stats.totalStudents
teacher.stats.completionRate
teacher.stats.averageAccuracy
teacher.stats.wordsAttempted
teacher.stats.wordsMastered
teacher.wordSelector.title
teacher.wordSelector.saveAsLesson
teacher.wordSelector.saveLessonTitle
teacher.wordSelector.lessonNamePlaceholder
teacher.wordSelector.noClassroom
teacher.wordSelector.selectWords
```

**Student Section (26 keys)**:
```
student.dashboard.title
student.dashboard.subtitle
student.lessons.lesson
student.lessons.words
student.lessons.mastered
student.lessons.practice
student.lessons.review
student.lessons.empty.title
student.lessons.empty.subtitle
student.lessons.sort.recent
student.lessons.sort.progress
student.practice.title
student.practice.definition
student.practice.yourAnswer
student.practice.submit
student.practice.next
student.practice.correct
student.practice.incorrect
student.practice.hint
student.practice.skip
student.practice.complete.title
student.practice.complete.subtitle
student.practice.complete.backToLessons
student.practice.progress.wordsLeft
student.practice.progress.streak
student.practice.progress.mastered
```

---

## Translation Resources & Constraints

### Available Translation Tools

**UX Writer Skill** (`/.claude/skills/ux-writer/SKILL.md`):
- Purpose: Write native-sounding copy, not literal translations
- Memory integration: Recalls past translation patterns
- Language-specific tone guidelines
- Access to translation glossary

**Translation Glossary** (`/.claude/skills/ux-writer/references/translation-glossary.md`):
- Core game terms translated
- Common actions and phrases
- Language-specific emoji placement rules
- Character count considerations

### Language-Specific Constraints

| Language | Direction | Font | Key Constraints |
|----------|-----------|------|-----------------|
| **Hebrew** | RTL | Rubik | Emoji at END of text (appears left in RTL) |
| **Spanish** | LTR | Fredoka | Latin American casual tone preferred |
| **Swedish** | LTR | Fredoka | Friendly, welcoming tone |
| **Japanese** | LTR | Fredoka | Energetic, integrated emoji naturally |

### Translation Quality Guidelines

From project rules (CLAUDE.md):
1. **Translation-First**: ALL UI text must use `t()` - NO hardcoded strings
2. **4-Language Support**: Hebrew (RTL), English, Swedish, Japanese, Spanish
3. **Native Feel**: Write as native speaker, not literal translation
4. **Concise**: Most UI text under 5 words
5. **Action-Oriented**: Use active verbs
6. **Context-Aware**: Educational/teaching context requires appropriate tone

### Educational Context Tone

Teacher vocabulary feature requires:
- **Professional** - Teachers are professionals
- **Clear** - Instructions must be unambiguous
- **Encouraging** - Students need positive reinforcement
- **Concise** - Classroom tools need efficiency

Examples from existing translations:
- English: "Practice vocabulary and track your progress"
- Hebrew: "תרגלו מילים ועקבו אחר ההתקדמות"
- Swedish: "Öva ordförråd och följ dina framsteg"
- Japanese: "語彙を練習し、進捗を追跡"

---

## Verification Strategy

### How to Verify Translation Completeness

**Option 1: Key Count Comparison**
```bash
node << 'EOF'
const en = require('./fe-next/translations/en.js').en;
const he = require('./fe-next/translations/he.js').he;
// ... load other languages

function getMissingKeys(source, target, path = '') {
  const missing = [];
  for (const key in source) {
    const newPath = path ? `${path}.${key}` : key;
    if (!(key in target)) {
      missing.push(newPath);
    } else if (typeof source[key] === 'object' && source[key] !== null) {
      missing.push(...getMissingKeys(source[key], target[key], newPath));
    }
  }
  return missing;
}
EOF
```

**Option 2: Runtime Translation Hook**
- Use `LanguageContext` to track missing translation calls
- Add warning logging for undefined keys in development

**Option 3: Build-Time Validation**
- Add npm script to validate translation completeness
- Run before commits/deploys

### Testing Translation Quality

**Manual Testing**:
1. Switch to each language in UI
2. Navigate through teacher/student flows
3. Verify text displays correctly
4. Check RTL rendering for Hebrew
5. Verify character spacing and line breaks

**Automated Testing**:
- Add translation key existence tests
- Verify all language files have matching structure
- Check for missing interpolation variables

---

## Phase 11 Implementation Review

### API Layer (`/lib/supabase/teacher.ts`)

**Exports**:
- Types: `Classroom`, `VocabularyLesson`, `StudentLessonProgress`, etc.
- Functions: `getClassrooms()`, `createClassroom()`, `getVocabularyLessons()`, etc.
- Language type: `Language = 'en' | 'he' | 'sv' | 'ja'` (missing 'es'!)

**FINDING**: TypeScript Language type missing Spanish ('es') - needs update

### Component Usage Patterns

**Translation hook usage**:
```typescript
import { useLanguage } from '@/contexts/LanguageContext';
const { t } = useLanguage();

// Usage in components
<h1>{t('teacher.dashboard.title')}</h1>
<button>{t('teacher.classroom.create')}</button>
```

**Common translation patterns**:
- Simple strings: `t('teacher.dashboard.title')`
- Pluralization: `t('teacher.classroom.members', { count: 5 })`
- Interpolation: `t('teacher.classroom.created', { date: '...' })`

---

## Dependencies & Related Work

### Translation System

**LanguageContext** (`/contexts/LanguageContext.tsx`):
- Provides `t()` function for translation lookup
- Handles language switching
- Supports interpolation and pluralization
- Falls back to English for missing keys

**Translation Loading**:
- Translations are statically imported
- No lazy loading (all languages bundled)
- Changes require rebuild

### Related Features

**Font System** (CLAUDE.md design system):
- Rubik font for Hebrew
- Fredoka font for other languages
- Configured in Tailwind CSS

**RTL Support**:
- Direction set in translation files: `"direction": "rtl"`
- CSS auto-handles RTL layout
- Shadow utilities flip for RTL (`shadow-hard` becomes `-4px 4px 0px`)

---

## Risk Assessment

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Outdated requirements** | HIGH | Verify with user that 93 keys need translation |
| **Translation quality** | MEDIUM | Use UX Writer skill + glossary for consistency |
| **Missing context** | MEDIUM | Review component usage before translating |
| **Character limits** | LOW | Test translations in actual UI |
| **Spanish type missing** | HIGH | Update TypeScript Language type to include 'es' |

### Open Questions

1. **Phase Requirements Accuracy**: Phase description claims 93 missing keys, but verification shows 0 missing. Which is correct?

2. **Translation Quality Audit**: Are existing translations accurate and high-quality, or do they need review/improvement?

3. **Spanish Language Support**: Language type in `teacher.ts` missing 'es' - is Spanish fully supported?

4. **Scope Clarification**: Should this phase:
   - A) Add missing translations (currently 0)
   - B) Review/improve existing translations
   - C) Verify translation completeness
   - D) Update outdated audit report

---

## Recommended Planning Approach

### Plan 13-01: Translation Audit & Verification

**Goal**: Determine actual translation gaps (if any)

**Tasks**:
1. Run automated key comparison across all 5 languages
2. Generate missing keys report
3. Review existing teacher/student translations for quality
4. Identify any mistranslations or tone issues
5. Update phase requirements based on findings

**Expected Outcome**: Accurate gap report (likely 0 missing keys)

### Plan 13-02: Translation Quality Review (if needed)

**Goal**: Improve translation quality for educational context

**Tasks**:
1. Review teacher.* keys for professional tone
2. Review student.* keys for encouraging tone
3. Verify technical terms (classroom, lesson, practice) consistency
4. Check character limits and UI fit
5. Test RTL rendering in Hebrew

**Expected Outcome**: High-quality, context-appropriate translations

### Alternative: Phase Closure

**If verification confirms 0 missing keys**:
- Document completion status
- Update v1 audit report
- Mark phase as complete
- No implementation needed

---

## Technical Implementation Notes

### If Translation Work Is Needed

**Process**:
1. Extract missing keys from English source
2. For each language:
   - Use UX Writer skill for native translation
   - Reference translation glossary
   - Maintain educational context tone
   - Verify character limits
3. Update language files
4. Run lint and build to verify
5. Manual testing in each language

**Tools**:
- UX Writer skill (`/.claude/skills/ux-writer/`)
- Translation glossary (`/.claude/skills/ux-writer/references/translation-glossary.md`)
- Memory recall for consistent patterns

**Quality Checks**:
- [ ] All keys exist in all 4 languages
- [ ] Translations sound native, not literal
- [ ] Educational tone maintained
- [ ] Character limits respected
- [ ] RTL rendering correct (Hebrew)
- [ ] No hardcoded strings in components
- [ ] Build passes
- [ ] Lint passes

---

## Files to Reference During Planning

**Translation Files**:
- `/fe-next/translations/en.js` - English source (3,041 keys)
- `/fe-next/translations/he.js` - Hebrew (3,041 keys)
- `/fe-next/translations/sv.js` - Swedish (3,041 keys)
- `/fe-next/translations/ja.js` - Japanese (3,041 keys)
- `/fe-next/translations/es.js` - Spanish (3,041 keys)

**Documentation**:
- `/CLAUDE.md` - Project overview and constraints
- `/fe-next/CLAUDE.md` - Detailed coding standards
- `/.claude/skills/ux-writer/SKILL.md` - Translation skill
- `/.claude/skills/ux-writer/references/translation-glossary.md` - Term reference

**Components Using Keys**:
- `/fe-next/components/teacher/*.tsx` - Teacher UI (4 files)
- `/fe-next/components/student/*.tsx` - Student UI (2 files)

**Database**:
- `/fe-next/supabase/migrations/056_teacher_vocabulary_builder.sql` - Schema
- `/fe-next/lib/supabase/teacher.ts` - API layer (update Language type!)

---

## Summary

**Phase 13 appears to be based on outdated information**. Current verification shows:
- ✅ All 93 teacher/student keys exist in all 4 target languages
- ✅ Translation structure is consistent (3,041 keys each)
- ⚠️ TypeScript Language type missing 'es' for Spanish
- ❓ Translation quality/accuracy not verified

**Recommendation**: Before creating implementation plans, verify with user:
1. Are the phase requirements current?
2. Is this about **adding** missing translations or **reviewing** existing ones?
3. Should we focus on quality improvement vs. gap filling?

**Likely Outcome**: Phase may need to pivot from "add translations" to "verify quality and update audit report".
