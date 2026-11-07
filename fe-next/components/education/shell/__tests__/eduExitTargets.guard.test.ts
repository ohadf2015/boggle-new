import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { describe, it, expect } from 'vitest';

const ROOT = join(__dirname, '..', '..', '..', '..');

const SCAN = [
  'components/education',
  'components/teacher',
  'components/student',
  'app/[locale]/teacher',
  'app/[locale]/student',
  'app/[locale]/join',
  'app/[locale]/education/access',
  'app/[locale]/education/classroom-game',
  'app/[locale]/education/live',
  'app/[locale]/education/help',
  'app/[locale]/education/duels',
];

// Public marketing pages: their header logo and content-table links may point at the game site.
const PUBLIC_PAGES = new Set([
  'components/education/landing',
  'components/education/EducationHero.tsx',
  'components/education/EducationLandingSections.tsx',
  'components/education/EducationLandingTemplate.tsx',
  'components/education/EducationPackages.tsx',
  'components/education/EducationRelatedLinks.tsx',
]);

const EDU_AREAS = new Set(['teacher', 'education', 'student', 'join', 'api']);

// Not the game home: legal and contact pages, opened in a new tab so the classroom stays open behind them.
const ALLOWED_OUTSIDE = [/^legal\//, /^contact(?:[/?#]|$)/];

// Files an open peer PR is rewriting; skipped rather than pinned so either merge order stays green.
const SAME_TAB_PENDING = new Set(['components/teacher/SubscriptionStatusCard.tsx']);

// `area` is narrowed to teacher|student by its own parser; navItems tests pin the hrefs.
const DYNAMIC_OK: Record<string, string> = {
  'components/education/shell/navItems.ts': '${area}',
};

// Owned by other pieces; each has a request filed. Remove an entry when its link moves.
const PENDING: Record<string, string> = {};

const TARGET = new RegExp(
  '(?:' +
  [
    String.raw`(?:\bhref|Href)\s*[=:]\s*\{?\s*(?:[\w.?]+\s*\?\?\s*)?`,
    String.raw`\brouter\.(?:push|replace|prefetch)\(\s*`,
    String.raw`\bredirect\(\s*`,
    String.raw`location\.(?:assign|replace)\(\s*`,
    String.raw`location\.href\s*=\s*`,
  ]
    .map((p) => `(?:${p})`)
    .join('|') + ')' + String.raw`([\x60'"])(\/[^\x60'"]*)`,
  'g',
);
const LOCALE_PREFIX = /^\/(?:\$\{(?:locale|language|lang|loc|currentLocale)\}|[a-z]{2}(?=[/?#]|$))/;
const CONST_HEAD = /^\$\{([A-Z][A-Z0-9_]*)\}/;
const EXPR_HEAD = /^\$\{[^}]*\}/;

function sourceFiles(p: string): string[] {
  const abs = join(ROOT, p);
  if (statSync(abs).isFile()) return [abs];
  return readdirSync(abs).flatMap((name) => {
    if (name === '__tests__' || name === 'node_modules') return [];
    const child = join(abs, name);
    if (statSync(child).isDirectory()) return sourceFiles(relative(ROOT, child));
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [child] : [];
  });
}

const isPublic = (rel: string) => [...PUBLIC_PAGES].some((p) => rel === p || rel.startsWith(`${p}/`));

const files = SCAN.flatMap(sourceFiles)
  .map((abs) => ({ rel: relative(ROOT, abs), src: readFileSync(abs, 'utf8') }))
  .filter(({ rel }) => !isPublic(rel));

const CONSTANTS: Record<string, string> = {};
for (const { src } of [...files, { src: readFileSync(join(ROOT, 'lib/seo/wordLists/paths.ts'), 'utf8') }]) {
  for (const m of src.matchAll(/export const ([A-Z][A-Z0-9_]*)\s*=\s*['"](\/[^'"]*)['"]/g)) CONSTANTS[m[1]] = m[2];
}

type Verdict = { kind: 'edu' } | { kind: 'allowed' } | { kind: 'dynamic'; expr: string } | { kind: 'outside'; head: string };

/** Where a link target lands, read after its locale prefix. */
function classify(target: string): Verdict {
  let rest = target.replace(LOCALE_PREFIX, '');
  const constant = CONST_HEAD.exec(rest);
  if (constant) {
    const value = CONSTANTS[constant[1]];
    if (value === undefined) return { kind: 'dynamic', expr: constant[0] };
    rest = value + rest.slice(constant[0].length);
  } else if (EXPR_HEAD.test(rest)) {
    return { kind: 'dynamic', expr: rest.match(EXPR_HEAD)![0] };
  }
  rest = rest.replace(/^\//, '');
  if (rest.startsWith('${')) return { kind: 'dynamic', expr: rest.match(EXPR_HEAD)?.[0] ?? rest };
  const head = rest.split(/[/?#$]/)[0];
  if (EDU_AREAS.has(head)) return { kind: 'edu' };
  if (ALLOWED_OUTSIDE.some((re) => re.test(rest))) return { kind: 'allowed' };
  return { kind: 'outside', head };
}

const findings = files.flatMap(({ rel, src }) =>
  [...src.matchAll(TARGET)].map((m) => ({ rel, target: m[2], verdict: classify(m[2]) })),
);

describe('edu exit targets: every in-product link stays in /teacher, /education, /student or /join', () => {
  it('scans a real file set and finds real links', () => {
    expect(files.length).toBeGreaterThan(300);
    expect(findings.length).toBeGreaterThan(100);
  });

  it('resolves the shared path constants it relies on', () => {
    expect(CONSTANTS).toMatchObject({
      TEACHER_PRO_CHECKOUT_PATH: '/teacher/upgrade',
      TEACHER_PRO_COMPARE_CHECKOUT_PATH: '/teacher/upgrade',
      QUICK_PLAY_PATH: '/education/classroom-game',
      HELP_PATH: '/education/help',
    });
  });

  it.each([
    ['`/${locale}`', 'outside'],
    ["'/'", 'outside'],
    ['`/${language}/pricing`', 'outside'],
    ['`/${lang}/singleplayer`', 'outside'],
    ["'/en/blog'", 'outside'],
    ['`/${locale}${TEACHER_PRO_CHECKOUT_PATH}`', 'edu'],
    ['`/${language}/teacher${query ? `?${query}` : ""}`', 'edu'],
    ["'/he/student/lessons'", 'edu'],
    ['`/${locale}/join/${code}`', 'edu'],
    ['`/${language}/legal/privacy`', 'allowed'],
    ['`/${locale}${listPath(l)}`', 'dynamic'],
    ['`/${locale}${UNKNOWN_PATH}`', 'dynamic'],
  ])('classifies %s as %s', (literal, kind) => {
    expect(classify(literal.slice(1, -1))).toMatchObject({ kind });
  });

  it.each([
    ['href={`/${language}`}'],
    ["router.push('/')"],
    ['router.replace(`/${locale}`)'],
    ["window.location.href = '/'"],
    ['redirect(`/${locale}/pricing`)'],
    ['exitHref: `/${lang}`'],
    ['href={exitHref ?? `/${language}`}'],
  ])('the target pattern catches %s', (sample) => {
    expect([...sample.matchAll(TARGET)]).toHaveLength(1);
  });

  it('no link lands outside the edu areas, except pending requests', () => {
    const outside = findings
      .filter((f) => f.verdict.kind === 'outside')
      .map((f) => `${f.rel} -> ${f.target}`)
      .filter((line) => !Object.entries(PENDING).some(([file, head]) => line.startsWith(`${file} -> `) && line.includes(`/${head}`)));
    expect(outside).toEqual([]);
  });

  it('a dynamic first segment appears only where its value is pinned elsewhere', () => {
    const dynamic = findings.filter((f) => f.verdict.kind === 'dynamic');
    const unexpected = dynamic.filter((f) => f.verdict.kind === 'dynamic' && DYNAMIC_OK[f.rel] !== f.verdict.expr);
    expect(unexpected.map((f) => `${f.rel} -> ${f.target}`)).toEqual([]);
  });

  it('every allowed outside link opens in a new tab', () => {
    const sameTab = findings
      .filter((f) => f.verdict.kind === 'allowed' && !SAME_TAB_PENDING.has(f.rel))
      .filter((f) => {
        const { src } = files.find((file) => file.rel === f.rel)!;
        const at = src.indexOf(f.target);
        const open = src.lastIndexOf('<', at);
        const close = src.indexOf('>', at);
        return !/target="_blank"/.test(src.slice(open, close)) || !/rel="noopener noreferrer"/.test(src.slice(open, close));
      })
      .map((f) => `${f.rel} -> ${f.target}`);
    expect(sameTab).toEqual([]);
  });

  it.each(Object.entries(PENDING))('pending entry %s -> /%s still exists (delete it once fixed)', (file, head) => {
    const hit = findings.some((f) => f.rel === file && f.verdict.kind === 'outside' && f.verdict.head === head);
    expect(hit).toBe(true);
  });
});
