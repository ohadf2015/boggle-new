/**
 * Deterministic puzzle miner for Connections bridge game.
 * Zero LLM, zero random without fixed seed.
 */

/**
 * Load word set from newline-delimited content.
 */
export function loadWordSet(content) {
  if (!content) return new Set();
  return new Set(
    content
      .split('\n')
      .map(line => line.trim().toLowerCase())
      .filter(word => word.length > 0)
  );
}

/**
 * Split compounds into {compound, left, right, bridge} triplets.
 * Enforces minimum 3-char per side.
 */
export function splitCompounds(dict, compounds) {
  const splits = new Set();
  const minLen = 3;

  for (const compound of compounds) {
    // Try all possible split points
    for (let i = minLen; i <= compound.length - minLen; i++) {
      const left = compound.substring(0, i);
      const right = compound.substring(i);

      if (dict.has(left) && dict.has(right)) {
        // Both sides are valid words; the bridge is the right side
        splits.add({
          compound,
          left,
          right,
          bridge: right,
        });
      }
    }
  }

  return splits;
}

/**
 * Build bridge graph: bridge -> {suffixes: Set<word>, prefixes: Set<word>}.
 * A bridge is a word that can be both a suffix (word1 + bridge) and prefix (bridge + word2).
 */
export function buildBridgeGraph(splits) {
  const graph = new Map();

  // First pass: collect all potential bridges and their uses
  for (const split of splits) {
    const { left, right } = split;

    // The right side can be a bridge (used as suffix: left + right = compound)
    if (!graph.has(right)) {
      graph.set(right, { suffixes: new Set(), prefixes: new Set() });
    }
    graph.get(right).suffixes.add(left);

    // The left side can also be a bridge (used as prefix: left + right = compound)
    if (!graph.has(left)) {
      graph.set(left, { suffixes: new Set(), prefixes: new Set() });
    }
    graph.get(left).prefixes.add(right);
  }

  // Convert to pairs format: bridge -> Set of {word1, word2}
  const pairGraph = new Map();
  for (const [bridge, { suffixes, prefixes }] of graph.entries()) {
    if (suffixes.size > 0 && prefixes.size > 0) {
      pairGraph.set(bridge, new Set());

      // Generate all combinations of (suffix, prefix)
      for (const word1 of suffixes) {
        for (const word2 of prefixes) {
          pairGraph.get(bridge).add({ word1, word2 });
        }
      }
    }
  }

  return pairGraph;
}

/**
 * Count distinct bridges for a given (word1, word2) candidate.
 * Returns the number of unique bridges that form valid compounds.
 */
export function calculateAmbiguity(word1, word2, graph) {
  let count = 0;

  for (const [bridge, pairs] of graph.entries()) {
    for (const pair of pairs) {
      if (pair.word1 === word1 && pair.word2 === word2) {
        count++;
        break; // Only count this bridge once per pair
      }
    }
  }

  return count;
}

/**
 * Calculate difficulty based on compound frequency rank.
 * freq map: word -> rank (lower rank = more common/frequent)
 * Easy: both compounds very common (rank ≤ 3000)
 * Hard: both compounds less common (rank > 15000)
 * Medium: otherwise
 */
export function calculateDifficulty(compound1, compound2, bridge, freq) {
  const freq1 = freq.get(compound1) ?? 8000; // Default to medium
  const freq2 = freq.get(compound2) ?? 8000;

  const easy1 = freq1 <= 3000;
  const easy2 = freq2 <= 3000;
  const hard1 = freq1 > 15000;
  const hard2 = freq2 > 15000;

  if (easy1 && easy2) return 'easy';
  if (hard1 && hard2) return 'hard';
  return 'medium';
}

/**
 * Generate deterministic ID for mined puzzles.
 */
export function generateDeterministicId(locale, index, type = 'm') {
  const paddedIdx = String(index).padStart(3, '0');
  return `${locale}-${type}-${paddedIdx}`;
}

/**
 * Deduplicate puzzles by (word1, bridge, word2), keeping highest quality.
 */
export function deduplicateByBridges(puzzles) {
  const seen = new Map();

  for (const puzzle of puzzles) {
    const key = `${puzzle.word1}|${puzzle.bridge}|${puzzle.word2}`;
    if (!seen.has(key) || (seen.get(key).quality ?? 0) < (puzzle.quality ?? 0)) {
      seen.set(key, puzzle);
    }
  }

  return Array.from(seen.values());
}

/**
 * Mine regular bridge puzzles.
 * For each bridge, find all valid (word1, word2) combinations where:
 *   - word1 + bridge = compound1 (valid)
 *   - bridge + word2 = compound2 (valid)
 * Returns array of {word1, bridge, word2, difficulty, ambiguity, id, quality_score}.
 */
export function minePuzzles(graph, freq, opts = {}, locale = 'en', startIdx = 0) {
  const { maxCandidates = 500 } = opts;
  const puzzles = [];
  const allCombos = [];

  // For each bridge, generate all valid (word1, word2) combinations
  for (const [bridge, pairs] of graph.entries()) {
    const pairArray = Array.from(pairs);

    // Find suffixes (word1+bridge) and prefixes (bridge+word2)
    const suffixes = new Set();
    const prefixes = new Set();

    for (const pair of pairArray) {
      suffixes.add(pair.word1);
      prefixes.add(pair.word2);
    }

    // Generate all combinations of suffix × prefix
    for (const word1 of suffixes) {
      for (const word2 of prefixes) {
        allCombos.push({ word1, bridge, word2 });
      }
    }
  }

  // Familiarity gate: every part AND both formed compounds must appear in the
  // frequency corpus — this is what separates real puzzles (PLAY+GROUND+HOG)
  // from dictionary junk (ABBOT+RIC+CIA). When no corpus is loaded the gate
  // would drop everything, so it only applies to a non-empty freq map.
  const rank = (w) => freq.get(w) ?? Infinity;
  const nonDegenerate = allCombos.filter(
    ({ word1, bridge, word2 }) =>
      word1 !== word2 && word1 !== bridge && word2 !== bridge &&
      word1.length >= 3 && word2.length >= 3 && bridge.length >= 3,
  );
  const gated = freq.size
    ? nonDegenerate.filter(({ word1, bridge, word2 }) =>
        [word1, bridge, word2, word1 + bridge, bridge + word2].every((w) => freq.has(w)))
    : nonDegenerate;

  // Most-familiar combos first (rank sum ascending); ties break lexically so
  // the output stays deterministic.
  gated.sort((a, b) => {
    const ra = rank(a.word1 + a.bridge) + rank(a.bridge + a.word2) + rank(a.bridge);
    const rb = rank(b.word1 + b.bridge) + rank(b.bridge + b.word2) + rank(b.bridge);
    if (ra !== rb) return ra - rb;
    return `${a.word1}|${a.bridge}|${a.word2}`.localeCompare(`${b.word1}|${b.bridge}|${b.word2}`);
  });

  // Generate puzzles
  for (let i = 0; i < Math.min(gated.length, maxCandidates); i++) {
    const { word1, word2, bridge } = gated[i];
    const compound1 = word1 + bridge;
    const compound2 = bridge + word2;

    const difficulty = calculateDifficulty(compound1, compound2, bridge, freq);
    const ambiguity = calculateAmbiguity(word1, word2, graph);
    const qualityScore = 1.0 / (1.0 + Math.log(Math.max(1, ambiguity)));

    puzzles.push({
      id: generateDeterministicId(locale, startIdx + i),
      word1: word1.toUpperCase(),
      bridge: bridge.toUpperCase(),
      word2: word2.toUpperCase(),
      difficulty,
      ambiguity,
      quality_score: qualityScore,
    });
  }

  return puzzles;
}

/**
 * Mine pyramid puzzles.
 * Pyramid: meta_answer + 3+ distinct bridges all forming valid compounds.
 */
export function minePyramids(graph, freq, opts = {}, locale = 'en', startIdx = 0) {
  const { maxCandidates = 100 } = opts;
  const pyramids = [];

  // Find all potential meta-answers (bridges that have enough pairs)
  const metaCandidates = [];
  for (const [bridge, pairs] of graph.entries()) {
    if (pairs.size >= 3) {
      metaCandidates.push(bridge);
    }
  }

  // Sort deterministically
  metaCandidates.sort();

  // Build pyramids
  for (let i = 0; i < Math.min(metaCandidates.length, maxCandidates); i++) {
    const meta = metaCandidates[i];
    const pairs = graph.get(meta);

    if (pairs.size < 3) continue; // Need at least 3 bridges

    // Sort pairs deterministically and take first 3+
    const pairArray = Array.from(pairs).sort((a, b) => {
      if (a.word1 !== b.word1) return a.word1.localeCompare(b.word1);
      return a.word2.localeCompare(b.word2);
    });

    const pyramidBridges = [];
    for (const pair of pairArray) {
      pyramidBridges.push({
        word1: pair.word1.toUpperCase(),
        bridge: meta.toUpperCase(),
        word2: pair.word2.toUpperCase(),
      });
    }

    if (pyramidBridges.length >= 3) {
      pyramids.push({
        id: generateDeterministicId(locale, startIdx + i, 'p'),
        meta_answer: meta.toUpperCase(),
        bridges: pyramidBridges,
      });
    }
  }

  return pyramids;
}
