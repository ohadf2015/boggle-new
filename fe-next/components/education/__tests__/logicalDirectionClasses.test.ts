import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

/**
 * Education and teacher UI must use LOGICAL direction utilities, not physical ones.
 *
 * Hebrew is a first-class locale here and the teacher access-request form is the
 * highest-intent screen in the funnel. Flexbox row direction mirrors under
 * `dir="rtl"` on its own; `text-left`, `ml-*`, `pr-*` and a bare `left-0` do
 * not, so they fight the reading direction in Hebrew. The logical equivalents
 * (`text-start`, `ms-*`, `pe-*`, `start-0`, `end-0`) mirror automatically, and
 * all of them exist in the installed Tailwind 4.
 *
 * A physical class is allowed only when it is already direction-aware — an
 * `isRTL ? … : …` ternary or an `ltr:`/`rtl:` variant pair. Every allowlist
 * entry carries its reason and is asserted to still exist, so the list cannot
 * rot into a blanket exemption.
 */

const COMPONENTS_DIR = join(__dirname, '..', '..');
const SCANNED_TREES = ['education', 'teacher'];

/** path (relative to components/) -> physical tokens that must stay, and why. */
const ALLOWLIST: Record<string, { tokens: string[]; why: string }> = {
  // ---- components/education ----
  'education/AchievementUnlockModal.tsx': {
    tokens: ['right-4', 'left-4'],
    why: 'ltr:right-4 rtl:left-4 variant pair — already mirrored',
  },
  'education/EducationHeader.tsx': {
    tokens: ['left-0', 'right-0', 'border-l-4', 'border-r-4', 'rounded-l-neo-lg', 'rounded-r-neo-lg'],
    why: 'the mobile drawer already mirrors ALL SIX inside one isRTL ternary — RTL gets left-0/border-r-4/rounded-r-neo-lg, LTR gets right-0/border-l-4/rounded-l-neo-lg, so border and radius are on the inner edge in both directions',
  },
  'education/ClassroomWaitingRoom.tsx': {
    tokens: ['border-r-neo-cyan', 'border-l-transparent'],
    why: 'the coloured arc of an animate-spin loader; the element rotates continuously so which quadrant is painted has no reading direction',
  },
  'education/student-preview/PreviewWaitingScreen.tsx': {
    tokens: ['border-r-neo-cyan'],
    why: 'same animate-spin loader arc',
  },
  'education/MultiLessonSelector.tsx': {
    tokens: ['left-2', 'right-2'],
    why: 'isRTL ? left-2 : right-2 ternary',
  },
  'education/TeacherOnboarding.tsx': {
    tokens: ['left-3', 'right-3'],
    why: 'isRTL ? left-3 : right-3 ternary',
  },
  'education/XpProgressBar.tsx': {
    tokens: ['left-0', 'right-0'],
    why: 'isRTL ? right-0 : left-0 ternary',
  },
  // ---- components/teacher ----
  'teacher/LessonTemplateEditor.tsx': {
    tokens: ['left-4', 'right-4'],
    why: 'isRTL ? left-4 : right-4 ternary',
  },
  'teacher/QuickStartButton.tsx': {
    tokens: ['text-left', 'text-right'],
    why: 'text-left is overridden by isRTL && "rtl text-right" on the same element',
  },
  'teacher/ProWelcomeCelebration.tsx': {
    tokens: ['text-right'],
    why: 'applied only inside isRTL && "rtl text-right"',
  },
};

/**
 * `left-1/2` and `right-1/2` are excluded everywhere: paired with
 * `-translate-x-1/2` they centre an element, they do not pick a side.
 */
/** A Tailwind spacing/inset value, so prose like "right-aligned" is not a hit. */
const VALUE = '(?:auto|full|px|\\[[^\\]]*\\]|\\d[\\d.]*(?:/\\d+)?)';

/**
 * All EIGHT physical token families in the bar:
 *   text-left/right · ml-/mr- · pl-/pr- · left-/right- · rounded-l-/rounded-r- ·
 *   border-l-/border-r-
 * The border/rounded families were missing from the first version of this
 * regex, so it reported zero while 38 hits stood — including every accent
 * stripe in the tree. They are matched with an optional value so a bare
 * `border-l` counts too, and the trailing `(?![\w])` keeps `rounded-lg` and
 * `border-lime` from registering as `rounded-l` / `border-l`.
 */
const PHYSICAL = new RegExp(
  '(?<![-\\w])(?:' +
    'text-(?:left|right)(?![-\\w])' +
    `|(?:m[lr]|p[lr])-${VALUE}(?![-\\w])` +
    `|(?:left|right)-(?!1/2(?![\\d/]))${VALUE}(?![-\\w])` +
    '|(?:border|rounded)-[lr](?:-[\\w./%\\[\\]-]+)?(?![\\w])' +
    ')',
  'g'
);

/**
 * Comments are not code. Without this, a comment explaining why a class was
 * changed counts as a violation of the very rule it documents — which is
 * exactly what happened: `AssignmentCreator.tsx` was fixed to `end-4` and its
 * explanatory comment kept this guard red.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__') continue;
      out.push(...sourceFiles(full));
      continue;
    }
    if (!/\.tsx?$/.test(entry) || entry.includes('.test.')) continue;
    out.push(full);
  }
  return out;
}

type Hit = { file: string; line: number; token: string };

function findPhysicalClasses(): Hit[] {
  const hits: Hit[] = [];
  for (const tree of SCANNED_TREES) {
    for (const file of sourceFiles(join(COMPONENTS_DIR, tree))) {
      const rel = relative(COMPONENTS_DIR, file);
      stripComments(readFileSync(file, 'utf8'))
        .split('\n')
        .forEach((line, index) => {
          for (const token of line.match(PHYSICAL) ?? []) {
            hits.push({ file: rel, line: index + 1, token });
          }
        });
    }
  }
  return hits;
}

describe('education and teacher UI use logical direction utilities', () => {
  const hits = findPhysicalClasses();

  it('has no un-allowlisted physical direction class', () => {
    const violations = hits.filter(hit => !ALLOWLIST[hit.file]?.tokens.includes(hit.token));
    expect(violations.map(v => `${v.file}:${v.line} ${v.token}`)).toEqual([]);
  });

  it('has no stale allowlist entry', () => {
    for (const [file, entry] of Object.entries(ALLOWLIST)) {
      for (const token of entry.tokens) {
        const found = hits.some(hit => hit.file === file && hit.token === token);
        expect(found, `${file} no longer uses ${token} — drop it from the allowlist`).toBe(true);
      }
    }
  });
});
