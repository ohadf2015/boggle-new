import { describe, it, expect } from 'vitest';
import {
  activeFreezes,
  findFreezeViolations,
  findRecentChangeViolations,
  routeDirFor,
  snippetChanges,
} from '../seo-freeze/violations.mjs';

const freeze = {
  frozen: [
    { path: '/es/juego-de-palabras-multijugador', until: '2026-11-22' },
    { path: '/en/competitive-word-games', until: '2026-09-19' },
  ],
};

function diff(file: string, ...lines: string[]): string {
  return [`diff --git a/${file} b/${file}`, `--- a/${file}`, `+++ b/${file}`, '@@ -1 +1 @@', ...lines].join('\n');
}

const ES_PAGE = 'fe-next/app/[locale]/juego-de-palabras-multijugador/page.tsx';

describe('seo freeze', () => {
  it('maps a locale path to its route directory', () => {
    expect(routeDirFor('/es/juego-de-palabras-multijugador')).toBe('fe-next/app/[locale]/juego-de-palabras-multijugador/');
    expect(routeDirFor('/en')).toBeNull();
  });

  it('treats `until` as exclusive', () => {
    expect(activeFreezes(freeze, '2026-11-21').map((e) => e.path)).toEqual(['/es/juego-de-palabras-multijugador']);
    expect(activeFreezes(freeze, '2026-11-22')).toEqual([]);
  });

  it('flags a title or description change on a frozen page', () => {
    const v = findFreezeViolations({
      freeze,
      today: '2026-10-25',
      diffText: diff(ES_PAGE, "-    description: 'old',", "+    description: 'new',"),
    });
    expect(v).toHaveLength(1);
    expect(v[0].path).toBe('/es/juego-de-palabras-multijugador');
  });

  it('flags constant-style snippets like SV_TITLE =', () => {
    const v = findFreezeViolations({
      freeze,
      today: '2026-10-25',
      diffText: diff(ES_PAGE, "-const ES_TITLE = 'a';", "+const ES_TITLE = 'b';"),
    });
    expect(v).toHaveLength(1);
  });

  it('allows body copy changes on a frozen page', () => {
    const v = findFreezeViolations({
      freeze,
      today: '2026-10-25',
      diffText: diff(ES_PAGE, '-        <h2>Viejo</h2>', '+        <h2>Nuevo</h2>'),
    });
    expect(v).toEqual([]);
  });

  it('ignores test files, expired freezes and unfrozen pages', () => {
    const lines = ["-    title: 'a',", "+    title: 'b',"];
    const diffText = [
      diff('fe-next/app/[locale]/juego-de-palabras-multijugador/page.test.tsx', ...lines),
      diff('fe-next/app/[locale]/competitive-word-games/page.tsx', ...lines),
      diff('fe-next/app/[locale]/play-boggle-online-free/page.tsx', ...lines),
    ].join('\n');
    expect(findFreezeViolations({ freeze, today: '2026-10-25', diffText })).toEqual([]);
  });

  it('treats a JSX title prop as page body', () => {
    const v = findFreezeViolations({
      freeze,
      today: '2026-10-25',
      diffText: diff(ES_PAGE, "-            title={t('a.title')}", "+              title={t('a.title')}", '-  <Card title="a" />', '+  <Card title="b" />'),
    });
    expect(v).toEqual([]);
  });

  it('flags a title map entry, using the hunk header git gives it', () => {
    const diffText = [
      `diff --git a/${ES_PAGE} b/${ES_PAGE}`,
      `--- a/${ES_PAGE}`,
      `+++ b/${ES_PAGE}`,
      '@@ -19 +19 @@ const metaTitles: Record<string, string> = {',
      "-  es: 'a',",
      "+  es: 'b',",
      '@@ -40 +40 @@ export default function Page() {',
      '-        <h2>a</h2>',
      '+        <h2>b</h2>',
    ].join('\n');
    const v = findFreezeViolations({ freeze, today: '2026-10-25', diffText });
    expect(v).toHaveLength(1);
    expect(v[0].lines).toEqual(["-  es: 'a',", "+  es: 'b',"]);
  });

  describe('recently changed snippets', () => {
    const RU_PAGE = 'fe-next/app/[locale]/erudit-onlayn/page.tsx';
    const titleDiff = diff(RU_PAGE, "-    title: 'a',", "+    title: 'b',");

    it('lists the non-test files whose title or description changed', () => {
      const diffText = [
        titleDiff,
        diff('fe-next/app/[locale]/erudit-onlayn/page.test.tsx', "-    title: 'a',", "+    title: 'b',"),
        diff('fe-next/app/[locale]/slovo-dnya/page.tsx', '-        <h2>a</h2>', '+        <h2>b</h2>'),
      ].join('\n');
      expect(snippetChanges(diffText).map((c) => c.file)).toEqual([RU_PAGE]);
    });

    it('flags a snippet that already changed on the base within 28 days', () => {
      const v = findRecentChangeViolations({
        changes: snippetChanges(titleDiff),
        lastChanged: { [RU_PAGE]: { sha: 'ba375e4', date: '2026-10-30' } },
        today: '2026-10-31',
      });
      expect(v).toHaveLength(1);
      expect(v[0]).toMatchObject({ file: RU_PAGE, sha: 'ba375e4', changedOn: '2026-10-30', until: '2026-11-27' });
    });

    it('allows a change once 28 days have passed, or when nothing changed it before', () => {
      const changes = snippetChanges(titleDiff);
      expect(
        findRecentChangeViolations({ changes, lastChanged: { [RU_PAGE]: { sha: 'x', date: '2026-10-03' } }, today: '2026-10-31' }),
      ).toEqual([]);
      expect(findRecentChangeViolations({ changes, lastChanged: {}, today: '2026-10-31' })).toEqual([]);
    });

    it('skips files that the freeze list already flagged', () => {
      const v = findRecentChangeViolations({
        changes: snippetChanges(titleDiff),
        lastChanged: { [RU_PAGE]: { sha: 'x', date: '2026-10-30' } },
        today: '2026-10-31',
        skipFiles: [RU_PAGE],
      });
      expect(v).toEqual([]);
    });
  });

  describe('metadata scope from file contents', () => {
    const PAGE = [
      "import type { Metadata } from 'next';",
      "const BASE_URL = 'https://www.lexiclash.live';",
      "const PAGE_TITLE = 'Old title';",
      'const META_FALLBACK = {',
      "  description: 'Fallback description',",
      '};',
      'export async function generateMetadata(): Promise<Metadata> {',
      '  return {',
      '    title: PAGE_TITLE,',
      "    description: 'Meta description',",
      '    openGraph: {',
      "      description: 'OG description',",
      '    },',
      '    ...META_FALLBACK,',
      '  };',
      '}',
      'const modes = [',
      "  { title: 'Classic', desc: 'Find words' },",
      '];',
      'export default function Page() {',
      '  return (',
      "    <TileGrid items={[{ title: 'Word Hunt', body: 'Find words' }]} />",
      '  );',
      '}',
    ];
    const edit = (lines: string[], n: number, text: string) => lines.map((l, i) => (i === n - 1 ? text : l));
    const hunk = (file: string, n: number, before: string[], after: string[]) =>
      [`diff --git a/${file} b/${file}`, `--- a/${file}`, `+++ b/${file}`, `@@ -${n} +${n} @@`, `-${before[n - 1]}`, `+${after[n - 1]}`].join('\n');
    const changed = (file: string, n: number, text: string, before = PAGE) => {
      const after = edit(before, n, text);
      const files: Record<string, string> = { [`base:${file}`]: before.join('\n'), [`head:${file}`]: after.join('\n') };
      return snippetChanges(hunk(file, n, before, after), (side: string, f: string) => files[`${side}:${f}`] ?? null);
    };

    it('ignores title keys of body tiles inside the page component', () => {
      expect(changed(ES_PAGE, 22, "    <TileGrid items={[{ title: 'Word Hunt!', body: 'Find words' }]} />")).toEqual([]);
    });

    it('ignores title keys in a top-level body list the metadata never reads', () => {
      expect(changed(ES_PAGE, 18, "  { title: 'Classic!', desc: 'Find words' },")).toEqual([]);
    });

    it('ignores every title key in a client component', () => {
      const client = ["'use client';", 'export default function PageClient() {', "  const tiles = [{ title: 'a' }];", '}'];
      expect(changed('fe-next/app/[locale]/guides/PageClient.tsx', 3, "  const tiles = [{ title: 'b' }];", client)).toEqual([]);
    });

    it('ignores a client component whose directive follows a comment, and a component named *Title', () => {
      const client = ['// Teacher classes', "'use client';", 'function ClassesTitle() {', "  return <h1 className='a'>x</h1>;", '}'];
      expect(changed('fe-next/app/[locale]/teacher/PageClient.tsx', 4, "  return <h1 className='b'>x</h1>;", client)).toEqual([]);
      const server = client.slice(2);
      expect(changed('fe-next/app/[locale]/teacher/Hero.tsx', 2, "  return <h1 className='b'>x</h1>;", server)).toEqual([]);
    });

    it('flags a title or description edit inside generateMetadata', () => {
      expect(changed(ES_PAGE, 10, "    description: 'New meta description',")).toHaveLength(1);
    });

    it('flags an openGraph description edit', () => {
      expect(changed(ES_PAGE, 12, "      description: 'New OG description',")).toHaveLength(1);
    });

    it('flags a TITLE constant edit', () => {
      expect(changed(ES_PAGE, 3, "const PAGE_TITLE = 'New title';")).toHaveLength(1);
    });

    it('flags an object generateMetadata reads by name', () => {
      expect(changed(ES_PAGE, 5, "  description: 'New fallback',")).toHaveLength(1);
    });

    it('flags a title edit in a content module the metadata imports', () => {
      const content = ['export const content = {', '  en: {', "    pageTitle: 'How to play',", '  },', '};'];
      expect(changed('fe-next/app/[locale]/how-to-play/content.ts', 3, "    pageTitle: 'How to play LexiClash',", content)).toHaveLength(1);
    });
  });
});
