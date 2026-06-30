/**
 * Wiktionary native-language meaning lookup.
 *
 * Fetches a short, NATIVE-language definition for a single word so daily-word
 * meanings come from a real dictionary (Wiktionary, CC BY-SA) instead of only the
 * LLM judge. On-demand + fail-soft: meanings are shown only for the tiny set of
 * served daily words, so a per-word HTTP call (cached in `daily_target_words.meaning`)
 * is the right tool — no bulk download. Any miss/parse-failure returns null so the
 * caller falls back to the LLM meaning.
 *
 * Two strategies, both off the MediaWiki action API `prop=extracts` per edition:
 *  - he: the plaintext extract is uniformly "== HEADWORD ==\n\n<definition>" — take
 *    the line after the first header.
 *  - en/es/sv/ja/ru: parse the full plaintext extract — find the word's language
 *    section, then its first part-of-speech subsection (ru: the explicit «Значение»
 *    section), then the first real definition line, skipping headword/inflection/
 *    pronunciation/nym/example noise. Per-edition structure differs, so each language
 *    has small targeted rules; anything uncertain → null (LLM fallback covers it).
 *
 * Runs SERVER-SIDE (Node/undici, where a custom User-Agent is allowed). It returns
 * null in a browser-like test env (jsdom/happy-dom forbids setting User-Agent), so the
 * network smoke must use a node test env.
 * See docs/2026-06-30-dictionary-meaning-enrichment.md.
 *
 * @module lib/dictionary/wiktionaryMeaning
 */

const MAX_LEN = 160; // results card shows a short gloss; cap long Wiktionary sentences
const TIMEOUT_MS = 8000;
const UA = 'LexiClash/1.0 (word game; +https://lexiclash.app)';

/** Word's own-language section heading in each edition. */
const LANG_SECTION: Record<string, string> = {
  en: 'English', es: 'Español', sv: 'Svenska', ja: '日本語', ru: 'Русский',
};

/** Part-of-speech subsection headers that introduce a definition, per edition. */
const POS_RE: Record<string, RegExp> = {
  en: /^(Noun|Verb|Adjective|Adverb|Pronoun|Numeral|Interjection|Conjunction|Preposition|Proper noun)\b/i,
  es: /^(Sustantivo|Verbo|Adjetivo|Adverbio|Pronombre|Interjección|Numeral|Forma)/i,
  sv: /^(Substantiv|Verb|Adjektiv|Adverb|Pronomen|Räkneord|Interjektion)/i,
  ja: /^(名詞|動詞|形容詞|副詞|形容動詞|代名詞|連体詞|感動詞|助詞)/,
};

/** Lines that are NOT a definition (synonyms/inflection/pronunciation/nym/usage). */
const SKIP_RE: Record<string, RegExp> = {
  en: /^(Synonyms?|Antonyms?|Hyponyms?|Hypernyms?|Coordinate terms?|Usage notes?|Derived terms?|Related terms?|Alternative forms?|Quotations?|Translations?|Conjugation|Declension)\b|^Terms? (relating|related)\b/i,
  es: /^(Uso|Sinónimos?|Antónimos?|Relacionados?|Información adicional|Locuciones)\b/i,
  sv: /^(uttal|Synonymer|Antonymer|Hyponymer|Hypernymer|Besläktade|Sammansättningar|Användning|Fraser|Översättningar|Böjningar)\b/i,
  ja: /^(アクセント|発音|IPA|活用|語源|類義語|対義語|関連語|翻訳|熟語|派生語)\b/i,
};

export function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ');
}

/** Normalize a raw definition: drop labels/tags/numbering, collapse whitespace, cap length. */
export function cleanMeaning(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = stripHtml(raw).replace(/\s+/g, ' ').trim();
  s = s.replace(/\s*\[[^\]]*\]/g, ' ');          // [from 9th c.] citation tags
  s = s.replace(/\s*◆.*$/, '');                   // ru example marker + everything after
  s = s.replace(/^\d+\s*/, '');                   // leading sense number
  s = s.replace(/^\([^)]{1,40}\)\s*/, '');        // leading "(countable)" / "(slang)" tag
  s = s.replace(/\s+/g, ' ').trim();
  if (!s) return null;
  if (s.length > MAX_LEN) {
    const cut = s.slice(0, MAX_LEN);
    const lastSpace = cut.lastIndexOf(' ');
    s = (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim() + '…';
  }
  return s || null;
}

function header(line: string): { level: number; title: string } | null {
  const m = line.match(/^(=+)\s*(.+?)\s*\1$/);
  return m ? { level: m[1].length, title: m[2].trim() } : null;
}

/** Body lines under the first header matching `match`, until a header of same-or-higher level. */
function section(lines: string[], match: (title: string) => boolean): string[] | null {
  for (let i = 0; i < lines.length; i++) {
    const h = header(lines[i]);
    if (h && match(h.title)) {
      const body: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        const hj = header(lines[j]);
        if (hj && hj.level <= h.level) break;
        body.push(lines[j]);
      }
      return body;
    }
  }
  return null;
}

/**
 * he.wiktionary plaintext extract: "[optional ראו גם …]\n== HEADWORD ==\n\n<definition>".
 * Take the first non-empty line after the first header.
 */
export function parseHebrewExtract(extract: string | null | undefined): string | null {
  if (!extract) return null;
  let afterHeader = false;
  for (const line of extract.split('\n')) {
    const t = line.trim();
    if (header(t)) { afterHeader = true; continue; }
    if (afterHeader && t) return cleanMeaning(t);
  }
  return null;
}

function isHeadword(line: string, word: string): boolean {
  const first = line.trim().split(/[\s(¦|]/)[0].toLowerCase();
  return first === word.toLowerCase();
}

/** en/es/sv/ja/ru: pull the first real definition out of a full plaintext extract. */
export function parseEditionExtract(
  extract: string | null | undefined,
  language: string,
  word: string,
): string | null {
  if (!extract) return null;
  const lines = extract.split('\n');
  const secTitle = LANG_SECTION[language];
  if (!secTitle) return null;
  // language section ("== Español ==", ru "= Русский ="); tolerate "кошка I"-style suffixes upstream
  const body = section(lines, (t) => t === secTitle);
  if (!body) return null;

  if (language === 'ru') {
    const sense = section(body, (t) => t === 'Значение');
    const first = sense?.find((l) => l.trim());
    return cleanMeaning(stripLeadingLabels(first));
  }

  const pos = section(body, (t) => POS_RE[language].test(t));
  if (!pos) return null;
  const skip = SKIP_RE[language];

  if (language === 'es') {
    // senses are "N <topic?>\n<gloss>" — gloss is the line after the first "N …" line
    for (let i = 0; i < pos.length; i++) {
      if (/^\d+(\s|$)/.test(pos[i].trim())) {
        const gloss = pos.slice(i + 1).find((l) => l.trim());
        return cleanMeaning(gloss);
      }
    }
    return null;
  }

  for (const raw of pos) {
    const l = raw.trim();
    if (!l) continue;
    if (skip.test(l)) continue;
    if (isHeadword(l, word)) continue;
    if (language === 'ja') return cleanMeaning(stripLeadingLabels(l));
    return cleanMeaning(l);
  }
  return null;
}

/** Strip leading domain/usage labels: ru "зоол." / ja "（ねこ）" reading groups. */
function stripLeadingLabels(line: string | null | undefined): string | null {
  if (!line) return null;
  let s = line.trim();
  s = s.replace(/^(（[^）]*）\s*)+/, '');       // ja leading full-width reading groups
  s = s.replace(/^((?:[a-zа-яё]{1,12}\.\s+){1,3})/i, ''); // ru "зоол. " domain labels
  return s.trim();
}

async function getJson(url: string): Promise<unknown | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA }, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractOf(data: unknown): string | undefined {
  const pages = (data as { query?: { pages?: Record<string, { extract?: string }> } } | null)?.query?.pages;
  return pages ? Object.values(pages)[0]?.extract : undefined;
}

export async function fetchWiktionaryMeaning(word: string, language: string): Promise<string | null> {
  const w = (word ?? '').trim();
  if (!w) return null;
  // Wiktionary disables first-letter capitalization, so common-noun pages are
  // lowercase; served words are stored uppercase. Lowercasing is a no-op for he/ja.
  const title = w.toLowerCase();

  const api = (lang: string, params: string) =>
    `https://${lang}.wiktionary.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&format=json${params}&titles=${encodeURIComponent(title)}`;

  if (language === 'he') {
    return parseHebrewExtract(extractOf(await getJson(api('he', '&exsentences=1'))));
  }
  if (LANG_SECTION[language]) {
    return parseEditionExtract(extractOf(await getJson(api(language, ''))), language, title);
  }
  return null; // unsupported language → LLM fallback
}
