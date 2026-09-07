/**
 * Every indexable education landing offers the no-account path exactly once.
 *
 * R5's critic found this block on `vocabulary-games-classroom` and nowhere else: the
 * hub, `esl-word-games` and `sight-words-practice` routed every CTA to
 * `/education/access`, which asks a teacher for an account before they have seen the
 * product work. The page that had it won its blind comparison partly because of it.
 *
 * Exactly one, not at least one. Two links to the same destination on one page is
 * link-spam rather than a second chance, and a count assertion is the only version of
 * this guard that stays honest when someone adds a third.
 *
 * Source-scanned rather than rendered: these are server components whose imports pull
 * the whole education tree, and the question here is structural — does the page carry
 * the link — which the source answers exactly.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { locales } from '@/i18n/config';
import { QUICK_PLAY_PATH, noAccountCopy } from '@/components/education/NoAccountCta';

const ROOT = join(__dirname, '..', '..', '..', '..');
const EDUCATION = join(ROOT, 'app', '[locale]', 'education');

/**
 * The landings that are indexable in at least one locale, plus the hub. Discovered,
 * so the next slug is covered by default rather than by someone remembering.
 * A route is in scope when it renders a hero — the sub-app routes under
 * `education/` (access, classroom-game, duels) are product, not landing pages.
 */
function landingPages(): Array<[string, string]> {
  const out: Array<[string, string]> = [['education (hub)', join(EDUCATION, 'PageClient.tsx')]];
  for (const name of readdirSync(EDUCATION)) {
    if (name.startsWith('__') || name.startsWith('.')) continue;
    const page = join(EDUCATION, name, 'page.tsx');
    const content = join(EDUCATION, name, 'content.ts');
    // A landing page is one with its own per-page copy module.
    if (existsSync(page) && existsSync(content)) out.push([name, page]);
  }
  return out;
}

const PAGES = landingPages();

describe('the no-account CTA', () => {
  it('finds the pages it is meant to guard', () => {
    // A silently-empty scan passes forever while covering nothing.
    expect(PAGES.length).toBeGreaterThanOrEqual(5);
    expect(PAGES.map(([n]) => n)).toContain('education (hub)');
    expect(PAGES.map(([n]) => n)).toContain('esl-word-games');
    expect(PAGES.map(([n]) => n)).toContain('sight-words-practice');
    expect(PAGES.map(([n]) => n)).toContain('vocabulary-games-classroom');
  });

  /**
   * Six of the twelve landings render through `EducationLandingTemplate`, which
   * carries the CTA once for all of them. Counting only the page file would read
   * those as missing it, so the template stands in for the pages that delegate.
   */
  const TEMPLATE = join(ROOT, 'components', 'education', 'EducationLandingTemplate.tsx');
  const sourceFor = (file: string) => {
    const src = readFileSync(file, 'utf8');
    return /EducationLandingTemplate/.test(src) ? readFileSync(TEMPLATE, 'utf8') : src;
  };

  it.each(PAGES)('%s carries exactly one quick-play link', (_name, file) => {
    const src = sourceFor(file);
    // Rendered either through the shared component or, if someone hand-rolls it,
    // as a literal href. Both count, so the guard cannot be dodged by inlining.
    const viaComponent = (src.match(/<NoAccountCta\b/g) ?? []).length;
    const viaLiteral = (src.match(/multiplayer\?quickPlay=true/g) ?? []).length;
    expect(viaComponent + viaLiteral).toBe(1);
  });

  it.each(PAGES)('%s imports the shared component rather than reinventing it', (_name, file) => {
    expect(sourceFor(file)).toMatch(/from '@\/components\/education\/NoAccountCta'/);
  });

  it('the template carries it exactly once, for the six pages that delegate', () => {
    const src = readFileSync(TEMPLATE, 'utf8');
    expect((src.match(/<NoAccountCta\b/g) ?? []).length).toBe(1);
  });
});

describe('the shared copy', () => {
  it.each([...locales])('%s is written natively, not left in English', (locale) => {
    const c = noAccountCopy(locale);
    expect(c.heading.trim().length).toBeGreaterThan(10);
    expect(c.body.trim().length).toBeGreaterThan(60);
    expect(c.cta.trim().length).toBeGreaterThan(0);
    expect(c.note.trim().length).toBeGreaterThan(0);
    if (locale === 'en') return;
    const en = noAccountCopy('en');
    expect(c.heading).not.toBe(en.heading);
    expect(c.body).not.toBe(en.body);
  });

  it('promises no account, and nothing the quick-play path does not deliver', () => {
    const blob = Object.values(noAccountCopy('en')).join(' ');
    expect(blob).toMatch(/no account|no sign-?up/i);
    // MultiplayerFlow auto-joins a guest with a stored-or-generated name. It does not
    // promise offline play, an app, or that scores persist — do not claim those here.
    expect(blob).not.toMatch(/offline|download the app|saved forever|progress is saved/i);
  });

  it('points at the guest route, locale-prefixed by the component', () => {
    expect(QUICK_PLAY_PATH).toBe('/multiplayer?quickPlay=true');
  });
});
