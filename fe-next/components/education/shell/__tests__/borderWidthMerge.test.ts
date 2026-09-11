/**
 * `cn()` silently deletes the border WIDTH from every control on these screens.
 *
 * Verified in this repo: `twMerge('border-neo border-neo-black') === 'border-neo-black'`.
 * tailwind-merge files `border-neo` / `border-neo-thick` (widths, declared as
 * `@utility` in globals.css) in the same class group as `border-neo-<colour>`,
 * so the later colour class wins and the width is dropped. Tailwind preflight
 * then applies `border-width: 0` and the control renders with NO border —
 * exactly the "buttons and options blend with the background" the user
 * reported, and an `edge<3` flag in `contrast-check.js`.
 *
 * The merge config is the contrast piece's to fix. Until it lands, every screen
 * in the no-scroll contract writes its widths literally (`border-[2px]`,
 * `border-[3px]`) beside the colour, which no merge group touches. A literal
 * width outside `cn()` is fine too — a plain string is never merged — but these
 * files are large and a class string moves into a `cn()` the moment a condition
 * is added to it, so the rule is applied uniformly.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

const SCREENS: readonly [string, string][] = [
  ['/teacher', 'components/teacher/TeacherDashboard.tsx'],
  ['/teacher (empty state)', 'components/teacher/PlayTabFirstRunCard.tsx'],
  ['/teacher (status row)', 'components/teacher/dashboard/TeacherStatusRow.tsx'],
  ['/teacher/curriculum', 'app/[locale]/teacher/curriculum/PageClient.tsx'],
  ['/teacher/reports', 'app/[locale]/teacher/reports/PageClient.tsx'],
  ['/teacher/classroom/[id]/analytics', 'app/[locale]/teacher/classroom/[id]/analytics/PageClient.tsx'],
  ['/teacher/profile', 'app/[locale]/teacher/profile/PageClient.tsx'],
];

describe.each(SCREENS)('%s', (_route, file) => {
  const src = readFileSync(path.join(ROOT, file), 'utf8');

  it('never pairs the border-neo width utility with a border colour', () => {
    const offenders = [...src.matchAll(/border-neo(-thick)?\s+border-neo-[a-z]+/g)].map((m) => m[0]);
    expect(offenders, `merged away by cn(): ${offenders.join(', ')}`).toEqual([]);
  });

  it('never pairs a border colour with the width after it either', () => {
    // Order does not save it — twMerge keeps the LAST of a group, so
    // `border-neo-black border-neo` loses the colour instead of the width.
    const offenders = [...src.matchAll(/border-neo-[a-z]+\s+border-neo(-thick)?(?![a-z-])/g)].map(
      (m) => m[0],
    );
    expect(offenders, `merged away by cn(): ${offenders.join(', ')}`).toEqual([]);
  });
});
