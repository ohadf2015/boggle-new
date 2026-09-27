#!/usr/bin/env node

/**
 * Deterministic puzzle miner CLI.
 * Usage: node mine-puzzles.mjs <locale> [--max N] [--type bridges|pyramids|all]
 *
 * Inputs:
 *   - backend/<locale>_words.txt (or english_words_approved.txt for en, kanji_compounds.txt for ja)
 *   - corpora/<locale>.txt (frequency rank list, one word per line)
 *
 * Output:
 *   - out/mined-<locale>.json (puzzles with id, word1, bridge, word2, difficulty, etc.)
 */

import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadWordSet,
  splitCompounds,
  buildBridgeGraph,
  minePuzzles,
  minePyramids,
} from './lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '../../..');

async function loadDictionary(locale) {
  const files = {
    en: 'backend/english_words_approved.txt',
    sv: 'backend/swedish_words_approved.txt',
    ja: 'backend/kanji_compounds.txt',
    he: 'backend/hebrew_words_approved.txt',
    es: 'backend/spanish_words_approved.txt',
    ru: 'backend/russian_words_approved.txt',
  };

  const file = files[locale];
  if (!file) {
    console.error(`No dictionary file configured for locale: ${locale}`);
    process.exit(1);
  }

  const filePath = path.join(PROJECT_ROOT, file);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return loadWordSet(content);
  } catch (err) {
    console.error(`Failed to read dictionary ${filePath}:`, err.message);
    process.exit(1);
  }
}

async function loadFrequencyMap(locale) {
  const corpusPath = path.join(__dirname, 'corpora', `${locale}.txt`);
  try {
    const content = await fs.readFile(corpusPath, 'utf-8');
    const freq = new Map();

    content
      .trim()
      .split('\n')
      .forEach((word, idx) => {
        freq.set(word.toLowerCase().trim(), idx + 1); // Rank (1-based)
      });

    return freq;
  } catch (err) {
    console.warn(`Frequency data not found for ${locale}`);
    console.warn(`  → Will generate proxy frequency scores from word patterns\n`);
    return null; // Signal to create proxy scores
  }
}

function generateProxyFrequency(dict) {
  // Create a frequency map based on word position in dictionary
  // Shorter, simpler words score higher (appear earlier)
  const freq = new Map();
  const words = [...dict].sort((a, b) => {
    // Prioritize by: length (shorter better), alphabetical
    if (a.length !== b.length) return a.length - b.length;
    return a.localeCompare(b);
  });

  words.forEach((word, idx) => {
    freq.set(word, idx + 1);
  });

  return freq;
}

function extractCompounds(dict, locale) {
  // For now, treat dict items as both words and compounds
  // (Real implementation would identify multi-word compounds)
  const compounds = new Set();

  for (const word of dict) {
    // Only consider words 6+ chars (likely compounds)
    if (word.length >= 6) {
      compounds.add(word);
    }
  }

  return compounds;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node mine-puzzles.mjs <locale> [--max N] [--type bridges|pyramids|all]');
    console.error('Example: node mine-puzzles.mjs en --max 500');
    process.exit(1);
  }

  const locale = args[0];
  let maxPuzzles = 500;
  let mineType = 'all'; // 'bridges', 'pyramids', 'all'

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--max' && args[i + 1]) {
      maxPuzzles = parseInt(args[++i], 10);
    }
    if (args[i] === '--type' && args[i + 1]) {
      mineType = args[++i];
    }
  }

  console.log(`Mining puzzles for ${locale} (max: ${maxPuzzles})...`);

  // Load data
  const dict = await loadDictionary(locale);
  console.log(`Loaded dictionary: ${dict.size} words`);

  let freq = await loadFrequencyMap(locale);
  if (!freq) {
    freq = generateProxyFrequency(dict);
    console.log(`Generated proxy frequency scores: ${freq.size} words`);
  } else {
    console.log(`Loaded frequency data: ${freq.size} entries`);
  }
  console.log();

  // Extract compounds from full dictionary
  const compounds = extractCompounds(dict, locale);
  console.log(`Identified ${compounds.size} potential compounds`);

  if (compounds.size === 0) {
    console.error('No compounds found. Check dictionary file.');
    process.exit(1);
  }

  // Mine splits from full dictionary
  const splits = splitCompounds(dict, compounds);
  console.log(`Found ${splits.size} valid splits\n`);

  // Build bridge graph (all splits are valid since both parts are in dictionary)
  const graph = buildBridgeGraph(splits);
  console.log(`Built bridge graph: ${graph.size} unique bridges\n`);

  const puzzles = [];
  const pyramids = [];

  if (mineType === 'bridges' || mineType === 'all') {
    const mined = minePuzzles(graph, freq, { maxCandidates: maxPuzzles }, locale);
    puzzles.push(...mined);
    console.log(`Mined ${mined.length} bridge puzzles`);
  }

  if (mineType === 'pyramids' || mineType === 'all') {
    const mined = minePyramids(graph, freq, { maxCandidates: Math.floor(maxPuzzles / 3) }, locale);
    pyramids.push(...mined);
    console.log(`Mined ${mined.length} pyramids`);
  }

  // Write output
  const outDir = path.join(__dirname, 'out');
  await fs.mkdir(outDir, { recursive: true });

  const outPath = path.join(outDir, `mined-${locale}.json`);
  const output = {
    locale,
    generated_at: new Date().toISOString(),
    stats: {
      total_words_in_dict: dict.size,
      identified_compounds: compounds.size,
      valid_splits_found: splits.size,
      unique_bridges: graph.size,
      puzzles_mined: puzzles.length,
      pyramids_mined: pyramids.length,
    },
    puzzles,
    pyramids,
  };

  await fs.writeFile(outPath, JSON.stringify(output, null, 2));
  console.log(`\n✓ Output written to: ${outPath}`);

  // Summary
  console.log(`\n=== Mining Summary ===`);
  console.log(`Locale: ${locale}`);
  console.log(`Puzzles: ${puzzles.length}`);
  console.log(`Pyramids: ${pyramids.length}`);

  if (puzzles.length > 0) {
    console.log(`\nFirst 3 puzzles:`);
    for (let i = 0; i < Math.min(3, puzzles.length); i++) {
      const p = puzzles[i];
      console.log(`  ${p.id}: ${p.word1} + ${p.bridge} → ${p.word2} (${p.difficulty})`);
    }
  }

  if (pyramids.length > 0) {
    console.log(`\nFirst pyramid:`);
    const p = pyramids[0];
    console.log(`  ${p.id}: meta=${p.meta_answer}`);
    for (const bridge of p.bridges.slice(0, 3)) {
      console.log(`    - ${bridge.word1} + ${bridge.bridge} → ${bridge.word2}`);
    }
  }
}

await main();
