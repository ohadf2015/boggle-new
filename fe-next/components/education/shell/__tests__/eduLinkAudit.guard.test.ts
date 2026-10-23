import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(__dirname, '..', '..', '..', '..');

const SCAN = [
  'components/education/shell',
  'components/education/EducationHeader.tsx',
  'components/education/EducationHeaderMobileMenu.tsx',
  'components/education/EducationMenuDropdown.tsx',
  'components/education/EducationBreadcrumbs.tsx',
  'components/education/TeacherGate.tsx',
  'components/education/AccessRedirectNotice.tsx',
  'components/student/pages',
  'app/[locale]/education/access',
  'app/[locale]/education/duels',
  'app/[locale]/education/help',
  'app/[locale]/student/PageClient.tsx',
  'app/[locale]/student/achievements',
  'app/[locale]/student/craft',
  'app/[locale]/student/review',
  'app/[locale]/student/lessons',
  'app/[locale]/student/profile',
];

const LOCALE_ROOT = /`\/\$\{(language|locale|lang|currentLocale)\}`/g;
const BOUNCES: [string, RegExp][] = [
  ['hardcoded /en link', /['"`]\/en(\/|['"`])/g],
  ['bare / link', /(href=|push\(|replace\()\s*\{?\s*['"`]\/['"`]/g],
  ['consumer singleplayer', /\/singleplayer\b/g],
  ['comparison page', /lexiclash-vs-/g],
];

// The one sanctioned way out, plus prefixes that are only ever extended (breadcrumb trail, SEO canonical URL).
const LOCALE_ROOT_ALLOWED: Record<string, number> = {
  'components/education/EducationBreadcrumbs.tsx': 2,
  'components/education/EducationHeader.tsx': 1,
  'components/education/EducationMenuDropdown.tsx': 1,
  'components/education/shell/TeacherAccountMenu.tsx': 1,
  'app/[locale]/student/profile/layout.tsx': 2,
};

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

const files = SCAN.flatMap(sourceFiles).map((abs) => ({ rel: relative(ROOT, abs), src: readFileSync(abs, 'utf8') }));

describe('edu link audit: nav-shell files never bounce to the game home', () => {
  it('scans a real file set', () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it.each(BOUNCES)('no %s', (_, re) => {
    const hits = files.flatMap(({ rel, src }) => (src.match(re) ? [rel] : []));
    expect(hits).toEqual([]);
  });

  it('a locale-root href appears only at the sanctioned exits', () => {
    const counts = Object.fromEntries(
      files.map(({ rel, src }) => [rel, (src.match(LOCALE_ROOT) ?? []).length] as const).filter(([, n]) => n > 0),
    );
    expect(counts).toEqual(LOCALE_ROOT_ALLOWED);
  });
});
