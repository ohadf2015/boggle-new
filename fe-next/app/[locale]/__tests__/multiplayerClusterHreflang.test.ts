/**
 * The es/he/sv/ja multiplayer landings used to name /en/multiplayer-word-game-online as their
 * English (and x-default) alternate. That URL 308-redirects to /en/free-multiplayer-word-game,
 * and Google discards hreflang that points at a redirect. They must name the canonical page,
 * and that page (in English) must name them back.
 */
import { describe, expect, it, vi } from 'vitest';

// The showcase client pulls in gsap plugins that do not resolve under vitest; metadata does not need it.
vi.mock('../free-multiplayer-word-game/Showcase3DClient', () => ({ default: () => null }));
import { generateMetadata as es } from '../juego-de-palabras-multijugador/page';
import { generateMetadata as he } from '../hebrew-multiplayer-word-game/page';
import { generateMetadata as sv } from '../swedish-multiplayer-word-game/page';
import { generateMetadata as ja } from '../japanese-word-game/page';
import { generateMetadata as freeMp } from '../free-multiplayer-word-game/page';

const BASE = 'https://www.lexiclash.live';
const EN = `${BASE}/en/free-multiplayer-word-game`;
const CLUSTER = {
  es: [es, 'es', `${BASE}/es/juego-de-palabras-multijugador`],
  he: [he, 'he', `${BASE}/he/hebrew-multiplayer-word-game`],
  sv: [sv, 'sv', `${BASE}/sv/swedish-multiplayer-word-game`],
  ja: [ja, 'ja', `${BASE}/ja/japanese-word-game`],
} as const;

type Gen = (p: { params: Promise<{ locale: string }> }) => Promise<{ alternates?: { languages?: unknown } }>;
const langsOf = async (gen: unknown, locale: string) =>
  ((await (gen as Gen)({ params: Promise.resolve({ locale }) })).alternates?.languages ?? {}) as Record<string, string>;

describe('multiplayer cluster hreflang', () => {
  for (const [name, [gen, locale, self]] of Object.entries(CLUSTER)) {
    it(`${name} points en + x-default at the canonical, never the 308 slug`, async () => {
      const langs = await langsOf(gen, locale);
      expect(langs.en).toBe(EN);
      expect(langs['x-default']).toBe(EN);
      expect(langs[locale]).toBe(self);
      expect(Object.values(langs).some((u) => u.includes('multiplayer-word-game-online'))).toBe(false);
    });
  }

  it('the English canonical names every localized landing back', async () => {
    const langs = await langsOf(freeMp, 'en');
    expect(langs.en).toBe(EN);
    expect(langs['x-default']).toBe(EN);
    for (const [, [, locale, self]] of Object.entries(CLUSTER)) expect(langs[locale]).toBe(self);
  });
});
