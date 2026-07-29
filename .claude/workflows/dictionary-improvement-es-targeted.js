export const meta = {
  name: 'dictionary-improvement-es-targeted',
  description:
    "Targeted Spanish dictionary expansion. Investigation found the 636k base wordlist is comprehensive on standard morphology; the real gaps are PRODUCTIVE morphology + colloquial/regional vocab. Generate words aimed at those gap classes, dual-judge (strict editor + native speaker, both must agree >=0.75), dedup-append survivors to the committed candidate file consumed by the backend verify->promote->heal pipeline, then report.",
  phases: [
    { title: 'Generate' },
    { title: 'Judge' },
    { title: 'Persist' },
    { title: 'Report' },
  ],
};

// es surface form for candidates/es.txt (must match backend FORM_RE ^[a-zñ]+$ after
// normalizeSpanishWord: lowercase, vowel-accents stripped, ñ PRESERVED).
const FORM_RULE =
  'Use only lowercase Spanish letters a-z and ñ. KEEP the letter ñ (e.g. "niño","mañana","niñito"). ' +
  'Remove ONLY vowel accent marks: á→a é→e í→i ó→o ú→u ü→u (e.g. "ratón"→"raton","pingüino"→"pinguino"). ' +
  'No proper nouns, no spaces, no hyphens, no punctuation, no abbreviations. Single standalone words only. ' +
  'Do NOT include clitic-attached verb forms (e.g. "dámelo","vámonos") or reflexive "-se" infinitives (e.g. "levantarse") — ' +
  'they are not standalone dictionary entries and will be rejected downstream.';

const CAND_FILE =
  '/Users/ohadfisher/git/boggle-new/fe-next/backend/dictionary/candidates/es.txt';
const REPORT_FILE =
  '/Users/ohadfisher/git/boggle-new/docs/nightly/dictionary/dictionary-improvement-es-targeted-report.md';

// Gap classes the investigation surfaced (probe + invalid_word_submissions analysis).
const CLASSES = [
  {
    key: 'diminutives',
    n: 80,
    brief:
      'COMMON Spanish DIMINUTIVES in genuine everyday use — forms ending -ito/-ita/-illo/-illa/-cito/-cita/-ico/-ica ' +
      'built from frequent nouns and adjectives. Examples of the TYPE: casita, perrito, gatito, ratito, poquito, solito, ' +
      'cafecito, panecillo, ventanilla, chiquito, ahorita, cerquita, despacito. Favour high-frequency, widely-understood forms.',
  },
  {
    key: 'augmentatives',
    n: 60,
    brief:
      'COMMON Spanish AUGMENTATIVES / intensives in everyday use — forms ending -azo/-aza/-ón/-ona/-ote/-ota. ' +
      'Examples of the TYPE: golazo, perrazo, casona, grandote, manaza, cabezón, portazo, exitazo, librote, calorazo. ' +
      'Real, commonly-used forms only — not invented escalations.',
  },
  {
    key: 'colloquial-regional',
    n: 80,
    brief:
      'COMMON COLLOQUIAL / informal everyday Spanish words used across Spain AND Latin America (Mexico, Argentina, Colombia, ' +
      'Chile, Caribbean) that a Spain-centric hunspell wordlist often MISSES — slang nouns/verbs/adjectives, interjections, ' +
      'everyday informal vocabulary. Examples of the TYPE: chido, padrisimo (padrísimo), chevere (chévere), pana, laburo, ' +
      'guagua, platicar, andale (ándale), chamba, chido, plata, lana, weon, chamaco, fome, bacano, parcero. Real words in real use.',
  },
  {
    key: 'derived-forms',
    n: 70,
    brief:
      'COMMON DERIVED Spanish words everyday speakers use that a limited base list may omit: agent nouns (-dor/-dora, -ante/-ente), ' +
      'result/abstract nouns (-cion/-ción→write "cion", -miento, -aje, -ura), participle-adjectives (e.g. acaecida, acalorada), ' +
      'and frequent -mente adverbs. Examples of the TYPE: acalorador, acaloradora, calentador, regulador, acaecida, asoleada, ' +
      'enfriamiento, aterrizaje, lentitud, rapidamente. Real, in-use words only.',
  },
  {
    key: 'everyday-gaps',
    n: 70,
    brief:
      'HIGH-FREQUENCY everyday Spanish words (concrete nouns, common verbs incl. frequent conjugated/participle forms, ' +
      'adjectives, adverbs) that a casual player would naturally type on a letter board — food, home, body, nature, family, ' +
      'feelings, school, tech, money. Prefer the kinds of words a 15-30 year old types in a fast word game.',
  },
];

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
  properties: {
    added: { type: 'number' },
    total: { type: 'number' },
  },
};

// normalize to candidate surface form in-script so dedup/judging operate on the
// SAME string the backend loader will key on. Strip vowel accents, keep ñ, lower.
const VOWEL = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', Á: 'a', É: 'e', Í: 'i', Ó: 'o', Ú: 'u', Ü: 'u' };
function normEs(raw) {
  const w = String(raw || '').trim().toLowerCase().replace(/[áéíóúüÁÉÍÓÚÜ]/g, (c) => VOWEL[c] || c);
  return /^[a-zñ]+$/.test(w) && w.length >= 2 ? w : null;
}

log(`es-targeted: ${CLASSES.length} gap classes, dual-judge gate, candidate-file delivery`);

// ── STAGE 1: Generate (one agent per gap class, in parallel) ────────────────
phase('Generate');
const genResults = await parallel(
  CLASSES.map((cls) => () =>
    agent(
      `You are an expert Spanish (Español) lexicographer improving a fast word game's dictionary for Spanish-speaking players across Spain and Latin America.

TASK: propose up to ${cls.n} ${cls.brief}

FORM RULES (words breaking these are silently discarded, so do not waste them): ${FORM_RULE}
Do NOT include offensive slurs. Return JSON {"words":[...]} — just the words, no definitions, no numbering.`,
      { label: `gen:${cls.key}`, phase: 'Generate', schema: WORDS_SCHEMA, model: 'sonnet' },
    ).then((r) => ({ key: cls.key, words: Array.isArray(r && r.words) ? r.words : [] })),
  ),
);

// collect + normalize + dedup
const seen = new Set();
const pool = [];
for (const g of genResults.filter(Boolean)) {
  let kept = 0;
  for (const raw of g.words) {
    const w = normEs(raw);
    if (w && !seen.has(w)) {
      seen.add(w);
      pool.push(w);
      kept++;
    }
  }
  log(`[gen:${g.key}] ${g.words.length} raw → ${kept} clean+novel`);
}
log(`pool: ${pool.length} unique candidate words to judge`);

// ── STAGE 2: Judge (dual persona, chunked; both must accept >=0.75) ──────────
phase('Judge');
const CHUNK = 160;
const chunks = [];
for (let i = 0; i < pool.length; i += CHUNK) chunks.push(pool.slice(i, i + CHUNK));

const judgePrompt = (persona, words) =>
  `You are ${persona}. For EACH word decide whether it is a VALID, real, standalone Spanish word that should be ACCEPTED in a word game played by Spanish speakers (Spain + Latin America).
Mark valid:false for: non-words, misspellings, wrong language, proper nouns, abbreviations, clitic-attached verbs (e.g. "dámelo"), reflexive "-se" infinitives, or anything not a genuine in-use word.
Accept common diminutives/augmentatives/colloquial/regional words that real native speakers use, even if a conservative dictionary omits them.
Words: ${JSON.stringify(words)}.
Return JSON {"verdicts":[{"word","valid","confidence"}...]} — exactly one entry per input word; confidence 0..1.`;

const judged = await parallel(
  chunks.map((chunk, idx) => async () => {
    const [strict, native] = await parallel([
      () => agent(judgePrompt('a strict prescriptive Spanish dictionary editor (RAE-minded)', chunk), {
        label: `judge-strict:${idx}`, phase: 'Judge', schema: JUDGE_SCHEMA,
      }),
      () => agent(judgePrompt('a fluent native Spanish speaker who plays word games daily', chunk), {
        label: `judge-native:${idx}`, phase: 'Judge', schema: JUDGE_SCHEMA,
      }),
    ]);
    const votes = new Map();
    for (const j of [strict, native]) {
      for (const v of (j && j.verdicts) || []) {
        const w = normEs(v && v.word);
        if (w && v.valid === true && Number(v.confidence) >= 0.75) {
          votes.set(w, (votes.get(w) || 0) + 1);
        }
      }
    }
    const kept = chunk.filter((w) => (votes.get(w) || 0) >= 2);
    log(`[judge chunk ${idx}] kept ${kept.length}/${chunk.length}`);
    return kept;
  }),
);
const survivors = Array.from(new Set(judged.filter(Boolean).flat()));
log(`dual-judge survivors: ${survivors.length}/${pool.length}`);

// ── STAGE 3: Persist (dedup-append to committed candidate file) ──────────────
phase('Persist');
let persistResult = { added: 0, total: 0 };
if (survivors.length) {
  persistResult = await agent(
    `Edit the repo file ${CAND_FILE} (UTF-8, one word per line; lines starting with # are comments).
Steps:
1. Read ${CAND_FILE}. Collect existing words (skip comment/blank lines).
2. From this candidate list, keep ONLY words NOT already present (exact string match): ${JSON.stringify(survivors)}.
3. Append the genuinely-new words to the END of the file, one per line, under a new comment line "# --- targeted expansion (productive morphology + colloquial/regional) ---" (add that comment only once, before the new block; if it already exists, append under it).
4. Preserve ALL existing content. Do not reorder or delete anything. Write the file back.
Return JSON {"added": <count of new words appended>, "total": <total non-comment word lines now>}.`,
    { label: 'persist:es', phase: 'Persist', schema: PERSIST_SCHEMA, agentType: 'general-purpose' },
  );
} else {
  log('no survivors to persist');
}
const added = persistResult && Number(persistResult.added) > 0 ? Number(persistResult.added) : 0;

// ── STAGE 4: Report ─────────────────────────────────────────────────────────
phase('Report');
const perClass = genResults.filter(Boolean).map((g) => `  - ${g.key}: ${g.words.length} raw`).join('\n');
const sample = survivors.slice(0, 60).join(', ');
const reportBody = [
  '# Spanish dictionary — targeted expansion run',
  '',
  '## Why targeted (investigation summary)',
  '- Base list `an-array-of-spanish-words` ≈ 636,598 words — comprehensive on conjugations, plurals, common nouns/adjectives/adverbs, and even slang (guay/vale/chaval).',
  '- The accented-word rejection bug (null gameLanguage → English regex) is FIXED + deployed (`ff9b2803c`); no `UnresolvedGameLanguageError` in Sentry.',
  '- `invalid_word_submissions` (es) is ~90% Boggle-drag noise; verify→promote cron is alive (verified same day).',
  '- Genuine gaps are NARROW + productive: diminutives, augmentatives, colloquial/regional vocab, some derived forms.',
  '',
  '## This run',
  `- Generated across ${CLASSES.length} gap classes:`,
  perClass,
  `- Unique clean+novel pool: **${pool.length}**`,
  `- Dual-judge survivors (strict editor AND native speaker, both ≥0.75): **${survivors.length}**`,
  `- New candidates appended to candidates/es.txt: **${added}** (total now ${persistResult.total ?? '?'})`,
  '',
  '## Sample of survivors',
  sample || '(none)',
  '',
  '## Delivery',
  'Appended to `fe-next/backend/dictionary/candidates/es.txt`. They enter the backend verify→promote→heal pipeline',
  '(Wiktionary-es deterministic verification + offensive filter) via the proactive-discovery cron.',
  'Only externally-verified, non-offensive words are promoted into `word_scores` and become valid in-game.',
].join('\n');

await agent(
  `Write this exact content to ${REPORT_FILE} (create the docs/nightly/dictionary directory if needed; overwrite). Then return the word "done".\n\n----\n${reportBody}\n----`,
  { label: 'write-report', phase: 'Report', agentType: 'general-purpose' },
);

log(`es-targeted complete — pool ${pool.length}, survivors ${survivors.length}, added ${added}`);
return { pool: pool.length, survivors: survivors.length, added, total: persistResult.total };
