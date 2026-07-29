export const meta = {
  name: 'crossword-clue-craft',
  description: 'Craft + dual-judge crossword clues from dictionary definitions',
  phases: [{ title: 'Craft' }, { title: 'Judge' }],
};

// args = { entries: [{ word, defs: string[], pos, score }, ...] }
// Returns { results: [{ word, pos, score, clue, alt, judge1, judge2 }] }
// The MAIN THREAD applies pure gates (circular / length) and writes the clue bank — this
// workflow only does the LLM-dependent craft + judge steps.

const entries = (args && args.entries) || [];

const CRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['clue', 'alt'],
  properties: {
    clue: { type: 'string', description: 'The primary crossword clue' },
    alt: { type: 'string', description: 'An alternate clue, different style (may be empty)' },
  },
};

const JUDGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['score', 'reason'],
  properties: {
    score: { type: 'number', description: '0..1 quality score' },
    reason: { type: 'string' },
  },
};

const RULES = [
  'Write a CROSSWORD CLUE for the ANSWER — not a dictionary definition.',
  'NEVER include the answer, its plural, or any word sharing its first 4 letters.',
  'Max ~55 characters. Tight. No trailing period.',
  'No leading article (a/an/the). Strip parentheticals.',
  'Prefer a synonym, a short definitional phrase, or a "___" fill-in-the-blank.',
  'Solver-friendly, recognizable register. Sentence-case (capitalize first word only, plus proper nouns).',
  'A good clue could be solved by a smart person who does not know the word, from the wordplay/definition alone.',
].join('\n- ');

function craftPrompt(e) {
  const defs = e.defs.slice(0, 4).map((d) => '• ' + d.replace(/^[a-z]+\t/, '')).join('\n');
  return `You are a veteran crossword editor. ANSWER = "${e.word}" (part of speech: ${e.pos}).

Dictionary senses:
${defs}

Rules:
- ${RULES}

Return the best primary clue and one alternate (different angle). Examples of GOOD clues:
- OCEAN → "Atlantic or Pacific"
- RAPID → "Fast-moving"
- EMBER → "Glowing bit of a dying fire"
- ALOFT → "Up in the air"
Examples of BAD clues (do NOT do this): copying the raw definition, "(countable) a large body of water", using the answer word.`;
}

function judgePrompt(persona, c) {
  return `${persona}

ANSWER: "${c.word}"
CLUE: "${c.clue}"

Score 0..1 how good this is AS A CROSSWORD CLUE for that answer. Reward: concise, unambiguous-ish, reads like a real published clue, NOT a raw dictionary definition. Penalize: contains/echoes the answer, too long, clunky parentheticals, circular, reads like Wiktionary. Return score and a one-line reason.`;
}

const results = await pipeline(
  entries,
  (e) =>
    agent(craftPrompt(e), { phase: 'Craft', schema: CRAFT_SCHEMA, model: 'sonnet', label: `craft:${e.word}` })
      .then((c) => ({ ...e, clue: (c && c.clue) || '', alt: (c && c.alt) || '' })),
  (c) =>
    parallel([
      () =>
        agent(judgePrompt('You are a STRICT crossword editor who rejects anything that reads like a dictionary.', c), {
          phase: 'Judge',
          schema: JUDGE_SCHEMA,
          model: 'sonnet',
          label: `judge1:${c.word}`,
        }),
      () =>
        agent(judgePrompt('You are an avid crossword SOLVER. Would you accept and enjoy this clue?', c), {
          phase: 'Judge',
          schema: JUDGE_SCHEMA,
          model: 'sonnet',
          label: `judge2:${c.word}`,
        }),
    ]).then(([j1, j2]) => ({
      word: c.word,
      pos: c.pos,
      score: c.score,
      clue: c.clue,
      alt: c.alt,
      judge1: j1 ? j1.score : 0,
      judge2: j2 ? j2.score : 0,
    })),
);

return { results: results.filter(Boolean) };
