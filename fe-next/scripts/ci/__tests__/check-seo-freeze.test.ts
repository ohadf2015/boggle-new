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
});
