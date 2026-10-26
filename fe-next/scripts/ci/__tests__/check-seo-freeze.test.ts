import { describe, it, expect } from 'vitest';
import { activeFreezes, findFreezeViolations, routeDirFor } from '../seo-freeze/violations.mjs';

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
});
