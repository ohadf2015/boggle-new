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
  ['consumer site page', /['"`]\/(\$\{\w+\}\/)?(how-to-play|blog|faq|about|contact)(?=['"`/?#])/g],
];

// The sanctioned way out comes from educationExitHref; these are prefixes that are only ever extended (breadcrumb trail, SEO canonical URL).
const LOCALE_ROOT_ALLOWED: Record<string, number> = {
  'components/education/EducationBreadcrumbs.tsx': 2,
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

const read = (paths: string[]) =>
  paths.flatMap(sourceFiles).map((abs) => ({ rel: relative(ROOT, abs), src: readFileSync(abs, 'utf8') }));
const files = read(SCAN);

// Legal and contact pages wear consumer chrome (Home tab, logo), so from edu they open beside the app, never in place of it.
const NEW_TAB_SCAN = [
  'components/education',
  'components/teacher',
  'components/student',
  'app/[locale]/teacher',
  'app/[locale]/join',
  'app/[locale]/student',
  'app/[locale]/education',
  'app/[locale]/pricing',
];
const newTabFiles = read(NEW_TAB_SCAN);
// An open peer PR is rewriting these; skipped rather than pinned so either merge order stays green.
const PEER_PR_FILES = new Set(['components/teacher/SubscriptionStatusCard.tsx']);
const CONSUMER_HREF = /href=\{?\s*[`'"][^`'"]*\/(legal|contact)(?![\w-])/g;

function sameTabConsumerLinks(src: string): string[] {
  return [...src.matchAll(CONSUMER_HREF)].flatMap((m) => {
    const at = m.index ?? 0;
    const start = Math.max(src.lastIndexOf('<Link', at), src.lastIndexOf('<a ', at));
    const ends = ['</Link>', '</a>', '/>'].map((tag) => src.indexOf(tag, at)).filter((i) => i >= 0);
    const element = src.slice(start, ends.length ? Math.min(...ends) : undefined);
    return /target=["']_blank["']/.test(element) ? [] : [element];
  });
}

describe('edu link audit: nav-shell files never bounce to the game home', () => {
  it('scans a real file set', () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it.each([
    ['hardcoded /en link', "href='/en/teacher'"],
    ['bare / link', "router.push('/')"],
    ['consumer singleplayer', 'href={`/${locale}/singleplayer`}'],
    ['comparison page', 'href={`/${locale}/lexiclash-vs-kahoot`}'],
    ['consumer site page', 'href={`/${language}/how-to-play`}'],
    ['consumer site page', "href={'/blog'}"],
    ['consumer site page', 'push(`/${locale}/faq`)'],
    ['consumer site page', 'href={`/${lang}/about`}'],
    ['consumer site page', "href='/contact'"],
  ])('the %s rule catches %s', (name, sample) => {
    const re = new RegExp(BOUNCES.find(([n]) => n === name)?.[1] ?? /$^/);
    expect(re.test(sample)).toBe(true);
  });

  it.each([
    ['consumer site page', 'href={`/${locale}/teacher/about-pro`}'],
    ['consumer site page', 'href={`/${locale}/education/help/contact-support`}'],
  ])('the %s rule leaves edu routes alone: %s', (name, sample) => {
    const re = new RegExp(BOUNCES.find(([n]) => n === name)?.[1] ?? /$^/);
    expect(re.test(sample)).toBe(false);
  });

  it.each(BOUNCES)('no %s', (_, re) => {
    const hits = files.flatMap(({ rel, src }) => (src.match(re) ? [rel] : []));
    expect(hits).toEqual([]);
  });

  it.each([
    ['href={`/${language}/legal/${page}`}>x</Link>', false],
    ['<Link href={`/${language}/legal/refund`} target="_blank" rel="noopener noreferrer">x</Link>', true],
    ['<Link href={`/${locale}/contact`} className="a">x</Link>', false],
    ['<a href={`/${locale}/contact`} target="_blank" />', true],
  ])('the consumer-page link rule judges %s as new-tab=%s', (sample, ok) => {
    const src = sample.startsWith('<') ? sample : `<Link ${sample}`;
    expect(sameTabConsumerLinks(src)).toHaveLength(ok ? 0 : 1);
  });

  it('leaves edu routes that merely contain the words alone', () => {
    expect(sameTabConsumerLinks('<Link href={`/${locale}/education/help/contact-support`}>x</Link>')).toEqual([]);
  });

  it('legal and contact pages open in a new tab from every edu file', () => {
    const hits = newTabFiles.flatMap(({ rel, src }) => (sameTabConsumerLinks(src).length ? [rel] : []));
    expect(hits.filter((rel) => !PEER_PR_FILES.has(rel))).toEqual([]);
  });

  it('a locale-root href appears only at the sanctioned exits', () => {
    const counts = Object.fromEntries(
      files.map(({ rel, src }) => [rel, (src.match(LOCALE_ROOT) ?? []).length] as const).filter(([, n]) => n > 0),
    );
    expect(counts).toEqual(LOCALE_ROOT_ALLOWED);
  });
});
