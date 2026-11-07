export const meta = {
  name: 'dictionary-improvement',
  description:
    "Extensively improve LexiClash game dictionaries: per language, LLM-generate common missing words, dual-judge them (two independent personas, both must agree), persist survivors to the committed candidate files that the backend verify->promote->heal pipeline consumes, then report. Args: {langs?:string[], lang?:string, limit?:number}.",
  phases: [
    { title: 'Generate' },
    { title: 'Judge' },
    { title: 'Persist' },
    { title: 'Report' },
  ],
};

// ── config ────────────────────────────────────────────────────────────────
const ALL_LANGS = ['en', 'he', 'sv', 'ja', 'es', 'ru'];
const LANG_NAMES = {
  en: 'English',
  he: 'Hebrew',
  sv: 'Swedish',
  ja: 'Japanese (hiragana)',
  es: 'Spanish',
  ru: 'Russian',
};
// Surface-form rules MUST match backend/modules/dictionaryImprovement/candidates.ts
// FORM_RE — anything else is dropped by the loader, so generating it is wasted.
const FORM_RULE = {
  en: 'lowercase a-z ONLY; no proper nouns, no accents, no spaces or hyphens',
  es: 'lowercase a-z and ñ ONLY; strip vowel accents (write "cafe" not "café") but KEEP ñ (write "niño", never "nino"); no proper nouns',
  sv: 'lowercase a-z plus å ä ö ONLY; no proper nouns',
  he: 'Hebrew letters ONLY (no niqqud/vowel points, no Latin); common standalone words',
  ja: 'HIRAGANA ONLY (no kanji, no katakana, no Latin, no spaces); common standalone words',
  ru: 'lowercase Cyrillic а-я ONLY; write е instead of ё; no proper nouns, no Latin, no hyphens',
};
const CAND_DIR = 'fe-next/backend/dictionary/candidates';

// ── args ──────────────────────────────────────────────────────────────────
const a = args || {};
const langs = Array.isArray(a.langs)
  ? a.langs.filter((l) => ALL_LANGS.includes(l))
  : typeof a.lang === 'string' && ALL_LANGS.includes(a.lang)
    ? [a.lang]
    : ALL_LANGS;
const perLang = Number(a.limit) > 0 ? Math.min(Number(a.limit), 200) : 40;

// ── schemas ─────────────────────────────────────────────────────────────--
const WORDS_SCHEMA = {
  type: 'object',
  required: ['words'],
  additionalProperties: true,
  properties: { words: { type: 'array', items: { type: 'string' }, maxItems: 200 } },
};
const JUDGE_SCHEMA = {
  type: 'object',
  required: ['verdicts'],
  additionalProperties: true,
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        required: ['word', 'valid', 'confidence'],
        properties: {
          word: { type: 'string' },
          valid: { type: 'boolean' },
          confidence: { type: 'number' },
        },
      },
    },
  },
};
const PERSIST_SCHEMA = {
  type: 'object',
  required: ['added'],
  additionalProperties: true,
  properties: { added: { type: 'number' }, total: { type: 'number' } },
};

log(`dictionary-improvement: ${langs.length} language(s) [${langs.join(', ')}], up to ${perLang} candidates each`);

// One independent chain per language. No barrier between stages — Spanish can be
// persisting while Hebrew is still generating. Each language writes its OWN file,
// so concurrent persist agents never conflict.
const results = await pipeline(
  langs,

  // STAGE 1 — generate candidate words.
  async (lang) => {
    const gen = await agent(
      `You are an expert ${LANG_NAMES[lang]} lexicographer improving a word game's dictionary.
Propose up to ${perLang * 3} REAL, standalone dictionary words in ${LANG_NAMES[lang]} that a word game should accept but a big wordlist might be MISSING. The game already knows nearly all everyday base forms, so aim for gaps: less common inflections (plurals, conjugations, comparatives), modern everyday words (tech, food, slang that dictionaries now list), and common compounds.
STRICT FORM RULES (words violating these are discarded downstream): ${FORM_RULE[lang]}.
Do NOT include offensive slurs or proper nouns. Return JSON {"words":[...]} — just the words, no definitions.`,
      { label: `generate:${lang}`, phase: 'Generate', schema: WORDS_SCHEMA },
    );
    const proposed = Array.isArray(gen && gen.words) ? gen.words.map((w) => String(w).trim()).filter(Boolean) : [];
    log(`[${lang}] generated ${proposed.length} candidate(s)`);
    if (!proposed.length) return { lang, proposed };
    // The game dictionary is the novelty authority: words it already accepts are wasted judge calls.
    const nov = await agent(
      `Run this exact command from the repo root and return its JSON output (the last line that starts with "["), nothing else:
cd fe-next && npx tsx scripts/dictionary/novelWords.ts ${lang} '${JSON.stringify(proposed).replace(/'/g, '')}' 2>/dev/null | grep '^\\[' | tail -1
Return JSON {"words":[...]} with exactly the words in that output.`,
      { label: `novelty:${lang}`, phase: 'Generate', schema: WORDS_SCHEMA, agentType: 'general-purpose' },
    );
    const novel = Array.isArray(nov && nov.words) ? nov.words.slice(0, perLang) : [];
    log(`[${lang}] ${novel.length}/${proposed.length} not already in the game dictionary`);
    if (!novel.length) log(`[${lang}] WARNING: novelty check returned nothing — is fe-next/scripts/dictionary/novelWords.ts present in this checkout?`);
    return { lang, proposed: novel };
  },

  // STAGE 2 — dual-judge: two independent personas; keep only words BOTH accept
  // with confidence >= 0.75. This mirrors the in-repo Connections dual-LLM gate
  // and the backend ensembleVerdict rule.
  async (prev, lang) => {
    const words = (prev.proposed || []).slice(0, 200);
    if (!words.length) return { lang, proposed: 0, kept: [] };
    const judgePrompt = (persona) =>
      `You are ${persona}. Judge whether EACH word is a VALID, real, standalone ${LANG_NAMES[lang]} word acceptable in a word game.
Mark valid:false for non-words, wrong script, proper nouns, abbreviations, or anything violating these form rules: ${FORM_RULE[lang]}.
Words: ${JSON.stringify(words)}.
Return JSON {"verdicts":[{"word","valid","confidence"}, ...]} with exactly one entry per input word; confidence is 0..1.`;
    const [j1, j2] = await parallel([
      () => agent(judgePrompt('a strict prescriptive dictionary editor'), { label: `judge-strict:${lang}`, phase: 'Judge', schema: JUDGE_SCHEMA }),
      () => agent(judgePrompt('a fluent native-speaker word-game player'), { label: `judge-native:${lang}`, phase: 'Judge', schema: JUDGE_SCHEMA }),
    ]);
    const votes = new Map();
    for (const j of [j1, j2]) {
      for (const v of (j && j.verdicts) || []) {
        if (v && v.valid === true && Number(v.confidence) >= 0.75) {
          votes.set(v.word, (votes.get(v.word) || 0) + 1);
        }
      }
    }
    const kept = words.filter((w) => (votes.get(w) || 0) >= 2);
    log(`[${lang}] dual-judge kept ${kept.length}/${words.length}`);
    return { lang, proposed: words.length, kept };
  },

  // STAGE 3 — persist survivors to the committed candidate file (dedup-append).
  // These are NOT the validation set — they are the queue feed; the backend
  // deterministic verifier (Wiktionary/Jisho/milog) + offensive filter remain
  // the final gate before any word reaches gameplay.
  async (prev, lang) => {
    if (!prev.kept || !prev.kept.length) {
      log(`[${lang}] nothing survived to persist`);
      return { lang, proposed: prev.proposed || 0, kept: 0, added: 0 };
    }
    const file = `${CAND_DIR}/${lang}.txt`;
    const persist = await agent(
      `Merge new dictionary candidate words into the repo file ${file} (one word per line; lines beginning with # are comments).
Steps:
1. Read ${file} (it exists). Collect the existing words (ignore comment/blank lines).
2. From this list, append ONLY words NOT already present (exact match): ${JSON.stringify(prev.kept)}.
3. Preserve all existing content and comments; append the genuinely-new words at the end, one per line.
4. Write the file back.
Return JSON {"added": <count of new words appended>, "total": <total word lines now>}.`,
      { label: `persist:${lang}`, phase: 'Persist', schema: PERSIST_SCHEMA, agentType: 'general-purpose' },
    );
    const added = persist && Number(persist.added) > 0 ? Number(persist.added) : 0;
    log(`[${lang}] persisted ${added} new candidate(s)`);
    return { lang, proposed: prev.proposed || 0, kept: prev.kept.length, added };
  },
);

// ── report ──────────────────────────────────────────────────────────────--
phase('Report');
const clean = results.filter(Boolean);
const totalAdded = clean.reduce((n, r) => n + (r.added || 0), 0);
const lines = clean.map((r) => `- **${r.lang}**: generated ${r.proposed ?? 0}, judge-kept ${r.kept ?? 0}, **added ${r.added ?? 0}** new candidate(s)`);
const reportBody = [
  `# Dictionary improvement run`,
  ``,
  `Languages: ${langs.join(', ')} · per-language cap: ${perLang} · total new candidates: **${totalAdded}**`,
  ``,
  ...lines,
  ``,
  `New candidates were appended to fe-next/backend/dictionary/candidates/<lang>.txt.`,
  `They enter the backend verify→promote→heal pipeline (Wiktionary/Jisho/milog + offensive filter)`,
  `via the proactive-discovery cron — only externally-verified, non-offensive words are promoted to gameplay.`,
].join('\n');

await agent(
  `Write this report to the repo file docs/nightly/dictionary/dictionary-improvement-report.md (create the docs/nightly/dictionary directory if needed; overwrite the file). Content:\n\n${reportBody}\n\nReturn the word "done".`,
  { label: 'write-report', phase: 'Report', agentType: 'general-purpose' },
);

log(`dictionary-improvement complete — ${totalAdded} new candidate(s) across ${clean.length} language(s)`);
return { langs, perLang, totalAdded, results: clean };
