import { loadWordSet, splitCompounds, buildBridgeGraph, minePuzzles, minePyramids } from './lib.mjs';
import { promises as fs } from 'fs';

// Load test dictionary
const content = await fs.readFile('./test-dict.txt', 'utf-8');
const dict = loadWordSet(content);
console.log('Dictionary:', dict.size, 'words');
console.log([...dict].sort().join(', '));

// Compounds are already in the dict
const compounds = new Set([...dict].filter(w => w.length >= 6));
console.log('\nCompounds:', compounds.size, 'items');
console.log([...compounds].sort().join(', '));

// Find splits
const splits = splitCompounds(dict, compounds);
console.log('\nSplits:', splits.size);
for (const split of splits) {
  console.log(`  ${split.compound} = ${split.left} + ${split.right}`);
}

// Build graph
const graph = buildBridgeGraph(splits);
console.log('\nBridge graph:', graph.size, 'bridges');
for (const [bridge, pairs] of graph.entries()) {
  console.log(`  "${bridge}": ${pairs.size} pairs`);
  for (const pair of pairs) {
    console.log(`    ${pair.word1} + ${pair.word2}`);
  }
}

// Mine puzzles
const freq = new Map();
const puzzles = minePuzzles(graph, freq, { maxCandidates: 10 }, 'en', 0);
console.log('\nMined puzzles:', puzzles.length);
for (const p of puzzles) {
  console.log(`  ${p.id}: ${p.word1} + ${p.bridge} = ${p.word2} (${p.difficulty})`);
}

// Mine pyramids
const pyramids = minePyramids(graph, freq, { maxCandidates: 10 }, 'en', 0);
console.log('\nMined pyramids:', pyramids.length);
for (const pyr of pyramids) {
  console.log(`  ${pyr.id}: meta=${pyr.meta_answer}, bridges=${pyr.bridges.length}`);
}
