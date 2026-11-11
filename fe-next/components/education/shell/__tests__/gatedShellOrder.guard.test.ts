/**
 * A gate that wraps the shell leaves its OWN branches outside the contract.
 *
 * Four teacher screens are wrapped in `TeacherGate` (and reports additionally in
 * `ProGate`). Both gates render three things: a loader while the entitlement is
 * unknown, a denial/upsell when it resolves negative, and the page when it
 * resolves positive. Only the third is the page's own markup — so a file that
 * reads
 *
 *     <TeacherGate><Inner /></TeacherGate>          // Inner mounts the shell
 *
 * satisfies every source check we have while the two states a teacher actually
 * meets first — "Shuffling letters…" and the Pro upsell — render with no shell,
 * no body lock, and the document scrolling again. Measured live on
 * `/en/teacher/reports` as a free teacher: `[data-testid=education-shell-scroll]`
 * absent, `body.className === 'antialiased screen-fit'` — unlocked.
 *
 * This is recurring pitfall class 3 in its usual shape: two routes to one
 * outcome, one of them quietly missing the setup. The fix is to hoist the shell
 * ABOVE the gate so all three branches land inside the one scrolling region.
 *
 * The assertion is about NESTING, not source order. An earlier version of this
 * file compared `indexOf('<Shell')` with `indexOf('<TeacherGate')` and passed on
 * every one of these files while all four were still broken — the inner
 * component that mounts the shell is simply declared above the exported one that
 * mounts the gate. Ordering in the file says nothing about ordering in the tree.
 *
 * Source-level because the gates' loading branch depends on Supabase auth state
 * that nine route clients would each need mocked to assert a static layout fact.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

/** Files whose default export puts a gate around the whole page. */
const GATED: readonly [string, string][] = [
  ['/teacher/classroom', 'app/[locale]/teacher/classroom/PageClient.tsx'],
  ['/teacher/reports', 'app/[locale]/teacher/reports/PageClient.tsx'],
  ['/teacher/curriculum', 'app/[locale]/teacher/curriculum/PageClient.tsx'],
  ['/teacher/classroom/[id]/analytics', 'app/[locale]/teacher/classroom/[id]/analytics/PageClient.tsx'],
  ['/teacher/profile', 'app/[locale]/teacher/profile/PageClient.tsx'],
];

/** Body of a top-level `function Name(...)` — up to the `}` in column one. */
function componentBody(src: string, name: string): string {
  const open = src.search(new RegExp(`function ${name}\\s*[(<]`));
  if (open < 0) return '';
  const end = src.indexOf('\n}', open);
  return src.slice(open, end < 0 ? src.length : end);
}

/** The element the exported component opens first — its outermost wrapper. */
function outermostWrapper(body: string): string {
  const ret = body.indexOf('return (');
  const tag = /<([A-Z]\w*)\b/.exec(ret < 0 ? body : body.slice(ret));
  return tag ? tag[1] : '';
}

describe.each(GATED)('%s — the gate renders INSIDE the shell', (_route, file) => {
  const src = readFileSync(path.join(ROOT, file), 'utf8');
  const exportedName = /export (?:default )?function (\w+)/.exec(src)?.[1] ?? '';
  const exported = componentBody(src, exportedName);

  it('names an exported route component', () => {
    expect(exportedName, 'no exported component found').not.toBe('');
    expect(exported, 'could not read the exported component body').not.toBe('');
  });

  it('wraps the gate in a shell the exported component opens itself', () => {
    const wrapper = outermostWrapper(exported);
    expect(wrapper, 'the exported component returns no element').not.toBe('');

    const gate = exported.search(/<TeacherGate\b/);
    expect(gate, 'this file is expected to use TeacherGate').toBeGreaterThan(-1);
    expect(
      gate,
      `the gate must be nested inside <${wrapper}> — a shell that lives only inside the gated child leaves the loader and the denial outside the no-scroll contract`,
    ).toBeGreaterThan(exported.indexOf(`<${wrapper}`));

    // ...and that wrapper has to BE the shell, not just any div.
    if (wrapper !== 'EducationShell') {
      const wrapperBody = componentBody(src, wrapper);
      expect(wrapperBody, `<${wrapper}> is not a component declared in this file`).not.toBe('');
      expect(wrapperBody, `<${wrapper}> does not mount EducationShell`).toMatch(/<EducationShell\b/);
      expect(wrapperBody, `<${wrapper}> does not render its children inside the shell`).toMatch(
        /\{children\}/,
      );
    }
  });

  it('mounts exactly one shell in the whole file', () => {
    // Hoisting the shell and forgetting to remove the inner one nests two
    // `h-dvh` roots and two scrolling regions — the page then feels like two
    // pages and the inner one is half a viewport tall.
    const opens = src.match(/<EducationShell\b/g) ?? [];
    const closes = src.match(/<\/EducationShell>/g) ?? [];
    expect(opens.length, `EducationShell opened ${opens.length}x`).toBe(1);
    expect(closes.length).toBe(1);
  });

  it('leaves no min-h-screen / extra scroller on any branch', () => {
    expect(src).not.toMatch(/min-h-screen|min-h-dvh|\bh-screen\b/);
    expect(src).not.toMatch(/overflow-y-auto/);
  });
});
