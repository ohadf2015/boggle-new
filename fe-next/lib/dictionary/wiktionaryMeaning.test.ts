import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  cleanMeaning,
  parseHebrewExtract,
  parseEditionExtract,
  fetchWiktionaryMeaning,
} from './wiktionaryMeaning';

// Real plaintext-extract shapes captured live from each edition's action API (2026-06-30).
const HE_WINDOW = '\n== חַלּוֹן ==\n\nפתח מתוכנן כלשהו בקירות של מבנה ובחומות שמאפשר לאור ולאוויר לחדור דרכו.';
const HE_SEE_ALSO = 'ראו גם חתול.\n\n== חָתוּל ==\n\nיונק טורף מבוית מהמשפחה החתוליים.';

const EN_CAT = `
== English ==

=== Etymology 1 ===
From Middle English cat.

=== Noun ===

cat (countable and uncountable, plural cats)

Terms relating to animals.
(countable) A mammal of the family Felidae.
Synonyms: felid, feline

=== Verb ===
to cat`;

const ES_CASA = `
== Español ==

=== Etimología 1 ===
Del latín casa.

==== Sustantivo femenino ====
casa ¦ plural: casas

1 Vivienda
Edificación destinada a vivienda.
2
Domicilio.`;

const SV_HUND = `Se även Hund.

== Svenska ==

=== Substantiv ===

hund

uttal: "en hund"
en underart (Canis lupus familiaris) till arten varg
Går du ut med hunden?
Synonymer: vovve`;

const JA_NEKO = `
== 漢字 ==

=== 字源 ===
形声。

== 日本語 ==

=== 名詞 ===
（ねこ、ネコ）ネコ科を構成する小型の哺乳類で、犬とともに古くからの愛玩動物。
ネコのような人。`;

const RU_DOM = `
= Русский =

=== Морфологические и синтаксические свойства ===
дом

=== Семантические свойства ===

==== Значение ====
архитектурное сооружение, предназначенное для жилья ◆ Просторный дом.`;

afterEach(() => vi.unstubAllGlobals());

describe('cleanMeaning', () => {
  it('collapses whitespace and trims', () => {
    expect(cleanMeaning('  a   small\ncat ')).toBe('a small cat');
  });
  it('strips a leading "(label)" tag and a leading sense number', () => {
    expect(cleanMeaning('(countable) A mammal')).toBe('A mammal');
    expect(cleanMeaning('1 A house')).toBe('A house');
  });
  it('strips trailing [citation] tags and ru ◆ examples', () => {
    expect(cleanMeaning('A structure [from 9th c.]')).toBe('A structure');
    expect(cleanMeaning('жильё ◆ Просторный дом.')).toBe('жильё');
  });
  it('returns null for empty/whitespace', () => {
    expect(cleanMeaning('')).toBeNull();
    expect(cleanMeaning(null)).toBeNull();
  });
  it('truncates long text on a word boundary with an ellipsis', () => {
    const out = cleanMeaning('word '.repeat(70).trim())!;
    expect(out.length).toBeLessThanOrEqual(161);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('parseHebrewExtract', () => {
  it('returns the definition after the headword header', () => {
    expect(parseHebrewExtract(HE_WINDOW)).toBe('פתח מתוכנן כלשהו בקירות של מבנה ובחומות שמאפשר לאור ולאוויר לחדור דרכו.');
  });
  it('skips a leading "see also" line', () => {
    expect(parseHebrewExtract(HE_SEE_ALSO)).toBe('יונק טורף מבוית מהמשפחה החתוליים.');
  });
  it('returns null for empty / no-header input', () => {
    expect(parseHebrewExtract('')).toBeNull();
    expect(parseHebrewExtract('prose without header')).toBeNull();
  });
});

describe('parseEditionExtract', () => {
  it('en: skips headword + "Terms relating to…" nym + Synonyms, returns the first real sense (label stripped)', () => {
    expect(parseEditionExtract(EN_CAT, 'en', 'cat')).toBe('A mammal of the family Felidae.');
  });
  it('es: takes the gloss line that follows the first numbered sense, not the topic label', () => {
    expect(parseEditionExtract(ES_CASA, 'es', 'casa')).toBe('Edificación destinada a vivienda.');
  });
  it('sv: skips headword + uttal, returns the first prose definition', () => {
    expect(parseEditionExtract(SV_HUND, 'sv', 'hund')).toBe('en underart (Canis lupus familiaris) till arten varg');
  });
  it('ja: finds 日本語 → 名詞 (not 漢字), strips the leading reading group', () => {
    expect(parseEditionExtract(JA_NEKO, 'ja', '猫')).toBe('ネコ科を構成する小型の哺乳類で、犬とともに古くからの愛玩動物。');
  });
  it('ru: reads the «Значение» section and cuts at the ◆ example marker', () => {
    expect(parseEditionExtract(RU_DOM, 'ru', 'дом')).toBe('архитектурное сооружение, предназначенное для жилья');
  });
  it('returns null when the language section is absent', () => {
    expect(parseEditionExtract('== Deutsch ==\n=== Substantiv ===\nHund', 'sv', 'hund')).toBeNull();
  });
  it('returns null for empty input', () => {
    expect(parseEditionExtract('', 'en', 'x')).toBeNull();
  });
});

describe('fetchWiktionaryMeaning', () => {
  it('returns null for an empty word and unsupported languages without a network call', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect(await fetchWiktionaryMeaning('  ', 'he')).toBeNull();
    expect(await fetchWiktionaryMeaning('x', 'fr')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('he: queries he.wiktionary and parses the native gloss', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ query: { pages: { '1': { extract: HE_WINDOW } } } }),
    }));
    expect(await fetchWiktionaryMeaning('חלון', 'he')).toContain('פתח מתוכנן');
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('he.wiktionary.org');
  });

  it('en: queries en.wiktionary and parses via the edition parser', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ query: { pages: { '1': { extract: EN_CAT } } } }),
    }));
    expect(await fetchWiktionaryMeaning('cat', 'en')).toBe('A mammal of the family Felidae.');
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('en.wiktionary.org');
  });

  it('lowercases the title (served words are stored UPPERCASE; Wiktionary pages are lowercase)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ query: { pages: { '1': { extract: EN_CAT } } } }),
    }));
    await fetchWiktionaryMeaning('CAT', 'en');
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('titles=cat');
  });

  it('fails soft to null on network error / non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));
    expect(await fetchWiktionaryMeaning('дом', 'ru')).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }));
    expect(await fetchWiktionaryMeaning('zzzz', 'es')).toBeNull();
  });
});
