# Deterministic Connections Bridge Puzzle Miner

**Zero-LLM, fully deterministic puzzle mining** for the Connections bridge game.

## Components

### `lib.mjs`
Core mining library. Functions:
- `loadWordSet(content)` - Parse word lists
- `splitCompounds(dict, compounds)` - Find valid (left+right) splits
- `buildBridgeGraph(splits)` - Map bridges to (word1, word2) pairs
- `minePuzzles(graph, freq, opts, locale, startIdx)` - Mine bridge puzzles
- `minePyramids(graph, freq, opts, locale, startIdx)` - Mine pyramid puzzles
- `calculateDifficulty(compound1, compound2, bridge, freq)` - Score by frequency
- `calculateAmbiguity(word1, word2, graph)` - Count bridge options
- `generateDeterministicId(locale, index, type)` - Stable IDs by sorted order
- `deduplicateByBridges(puzzles)` - Keep unique triplets

### `mine-puzzles.mjs`
CLI tool to mine puzzles from a dictionary.

**Usage:**
```bash
node mine-puzzles.mjs <locale> [--max N]
```

**Example:**
```bash
node mine-puzzles.mjs en --max 500
```

**Input:**
- `backend/<locale>_words_approved.txt` (or locale-specific file)
- `corpora/<locale>.txt` (frequency corpus, one word per line, most-common-first)

**Output:**
- `out/mined-<locale>.json` with:
  - `stats` - mining statistics
  - `puzzles[]` - bridge puzzles with {id, word1, bridge, word2, difficulty, ambiguity, quality_score}
  - `pyramids[]` - pyramid puzzles with {id, meta_answer, bridges[]}

### `fetch-corpora.mjs`
Download frequency word lists from GitHub (hermitdave/FrequencyWords).

**Usage:**
```bash
node fetch-corpora.mjs [locales...]
# or
node fetch-corpora.mjs en sv ja
```

**Note:** URLs pinned to specific GitHub revisions for reproducibility.

### `__tests__/lib.test.ts`
Comprehensive TDD test suite (28 tests, all passing). Tests cover:
- Word set loading and normalization
- Compound splitting with validation
- Bridge graph construction
- Difficulty and ambiguity scoring
- Deterministic ID generation
- Pyramid detection
- Deduplication logic

**Run tests:**
```bash
npm run test scripts/connections/mine/__tests__/lib.test.ts
```

## Mining Strategy

A **bridge puzzle** connects two common English words via a middle word (the "bridge"):
- `word1 + bridge = compound1` (real, valid)
- `bridge + word2 = compound2` (real, valid)

**Example:** GRAPE + VINE + YARD → grapevine + vineyard

### Algorithm
1. **Load** dictionary + frequency corpus
2. **Split**: Find compounds that split into (left, right) where both parts are valid words (min 3 chars each)
3. **Graph**: For each bridge word, collect all pairs (word1, word2) where:
   - word1 + bridge is in the compound set
   - bridge + word2 is in the compound set
4. **Generate**: For each bridge, create puzzles from all valid (word1, word2) combinations
5. **Rank**: Sort deterministically by (word1, bridge, word2)
6. **Filter**: Keep top N by quality score; pyramids require 3+ distinct bridges

### Difficulty Scoring
- **Easy**: Both compounds in top 500 by frequency
- **Hard**: Both compounds ranked 5000+ in frequency
- **Medium**: Otherwise
- **Default**: 8000 (medium) for unknown words

### Ambiguity Scoring
Counts how many bridge options exist for a given (word1, word2) pair.
- Higher ambiguity = lower quality (player shouldn't guess the bridge)
- Quality score = 1 / (1 + ln(ambiguity))

## Output Format

### Puzzle
```json
{
  "id": "en-m-000",
  "word1": "GRAPE",
  "bridge": "VINE",
  "word2": "YARD",
  "difficulty": "hard",
  "ambiguity": 1,
  "quality_score": 1.0
}
```

### Pyramid
```json
{
  "id": "en-p-000",
  "meta_answer": "VINE",
  "bridges": [
    { "word1": "GRAPE", "bridge": "VINE", "word2": "YARD" },
    { "word1": "CLIMBING", "bridge": "VINE", "word2": "APPLE" },
    { "word1": "WILD", "bridge": "VINE", "word2": "FRUIT" }
  ]
}
```

## Mined Results (Latest)

Run `node mine-puzzles.mjs <locale> --max N` for each locale:

| Locale | Dict Size | Compounds | Splits | Bridges | Puzzles | Pyramids |
|--------|-----------|-----------|--------|---------|---------|----------|
| **en** | 142,309   | 131,993   | 5,376  | 542     | 100     | 33       |
| **sv** | 1,837     | 1,096     | 13     | 2       | 6       | 1        |
| **ja** | 128,004   | 5,620     | 664    | 27      | 64      | 6        |

**Notes:**
- `en` uses `an-array-of-english-words` (50k common words) as frequency corpus
- `sv` / `ja` use minimal frequency lists (70-80 words) → fewer results
- Quality degrades without proper frequency ranking (many rare/technical words in dict)

## Limitations & Future Work

### Current Limitations
1. **Frequency data**: Without pinned corpus downloads, uses dictionary order or generates proxy scores
2. **Compound identification**: Relies on dictionary entries; many valid compounds aren't in the dict
3. **Language-specific**: Japanese kanji compounds need special handling (currently works on kanji pairs)
4. **Archaic/technical words**: Dictionaries contain rare words that split into valid parts but aren't real compounds

### Future Improvements
1. **Proper compound corpus**: Download or curate known valid compounds per language
2. **Language-specific splitting**: Hebrew/Swedish prefix/suffix handling
3. **Quality filtering**: Exclude rare technical jargon; score by recognizability
4. **Integration**: Pipe output to Supabase `connections_puzzles` table
5. **Batch validation**: Human review gate for quality assurance before shipping

## Reproducibility

✓ **Fully deterministic**: Same inputs → same outputs (no randomness, no timestamps in logic)
✓ **Stable ordering**: Sorted deterministically by word triplets
✓ **Pinned URLs**: fetch-corpora uses specific GitHub revisions
✓ **Version-locked library**: lib.mjs pure functions, no side effects

## Testing

All 28 unit tests pass. Tests use synthetic dictionaries to verify:
- RED-GREEN-REFACTOR TDD cycle
- Edge cases (empty sets, single words, no valid splits)
- Deterministic ID generation
- Quality scoring logic

```bash
node node_modules/vitest/vitest.mjs run scripts/connections/mine/__tests__/lib.test.ts
```

## Gitignore

- `/corpora/*.txt` - Downloaded frequency lists (2.5MB)
- `/out/*.json` - Mined puzzle outputs

Both can be regenerated; only `.mjs`, `.ts`, and `.gitignore` are committed.

## Known quality ceiling (2026-08-01)

Regular-puzzle mining is structurally correct and deterministic, but its
OUTPUT QUALITY is capped by the input data: `backend/*_approved.txt` contains
proper nouns and crossword fragments (SIL, VERMONT, CIA), and the
OpenSubtitles frequency lists contain names. Mined regular candidates are
therefore CANDIDATES ONLY — route them through the review pipeline (or swap in
a curated lemma corpus, e.g. NGSL/wordfreq intersection) before activation.

`pyramids-from-pool.mjs` is the exception: it mines pyramids from the already
curated active pool, so its output inherits native-judged quality and can ship
after a light review. Re-run it whenever the regular pool grows.
