/**
 * Generate verified sealed bid racks from word dictionaries.
 * Uses hand-seeded racks with dictionary validation.
 * Run: npx tsx scripts/genSealedBidRacks.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { canFormFromRack, letterScore } from '../lib/sealedBid/sp/sbEngine';
import { normalizeHebrewWord } from '../shared/utils/wordNormalization';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface GeneratedRack {
  letters: string;
  bingoWords: string[];
  wordsByLen: Record<string, string[]>;
  botPicks: string[];
}

// Hand-seeded racks to avoid massive computation
const HAND_SEEDED_RACKS: Record<string, string[]> = {
  en: [
    'AEINRST', // RETINAS, SINTER, TRAIN, STEIN, RAIN, ANT
    'ADELORS', // LOADERS, SOARED, ROADS, LOAD, ROSE, ADS
    'ACEHORT', // TOCHER, OTHER, TORCH, ROACH, COAT, HOT
    'EGILNRS', // SLINGER, SINGLE, SLING, LINER, REIN, GEL
    'AEHMPRT', // CHAPTER, PREACH, HEART, TRAP, HATE, ART
    'DEILMNO', // ELODIN, LEMON, MINED, DIME, MILE, ODE
    'BEINRST', // INERTS, BRINE, BINS, BENT, BITE, BIT
    'ACELMNO', // OLECAN, CLEAN, LANCE, OCEAN, LEAN, OLE
    'ADELMNT', // MENTAL, DELTA, METAL, DEAL, TALE, AND
    'EGINORT', // TOEING, TONER, GRIN, GONE, TIRE, ERG
    'ACILMRS', // CLAIMS, CREAM, CALM, SLIM, SLAM, AIM
    'AEGHNOT', // THONG, AGENT, TANGO, OATH, GONE, AGE
    'AILMRST', // TRAILS, TRIAL, SMILT, MAILS, MAIL, AIL
    'ADEINST', // DETAINS, INSTEAD, STAIN, DENTS, DINS, DIN
    'ACEINST', // CANTIES, ANTICS, SATIN, CANES, CANE, ACE
  ],
  he: [],
};

function loadWordsForLang(lang: string): string[] {
  if (lang === 'en') {
    // Load English words from npm package
    try {
      const englishWords = require('an-array-of-english-words');
      return (englishWords as string[])
        .map((w) => w.toUpperCase())
        .filter((w) => /^[A-Z]+$/.test(w));
    } catch {
      console.warn('Could not load English words from npm, using small seed');
      return [];
    }
  } else if (lang === 'he') {
    // Load Hebrew words from file
    try {
      const filePath = path.join(__dirname, '../backend/hebrew_words.txt');
      const content = fs.readFileSync(filePath, 'utf-8');
      return content
        .split('\n')
        .map((line) => line.trim().toUpperCase())
        .filter((word) => word.length > 0 && /^[א-ת]+$/.test(word))
        .map(normalizeHebrewWord);
    } catch {
      console.warn('Could not load Hebrew words from file, using small seed');
      return [];
    }
  }
  return [];
}

async function generateRacksForLang(
  rackSeeds: string[],
  words: string[],
  lang: string,
): Promise<GeneratedRack[]> {
  console.log(
    `[${lang}] Generating racks from ${rackSeeds.length} hand-seeded racks...`,
  );

  const candidates: GeneratedRack[] = [];

  for (let i = 0; i < rackSeeds.length; i++) {
    const rackLetters = rackSeeds[i]!;
    const wordsByLen: Record<string, string[]> = {};
    const bingoWords: string[] = [];

    // Scan words to find formable ones
    for (const word of words) {
      if (!canFormFromRack(word, rackLetters)) continue;

      const len = word.length.toString();
      if (!wordsByLen[len]) {
        wordsByLen[len] = [];
      }
      wordsByLen[len].push(word);

      // Track 7-letter bingo words
      if (word.length === 7) {
        bingoWords.push(word);
      }
    }

    // De-duplicate arrays
    for (const len in wordsByLen) {
      wordsByLen[len] = [...new Set(wordsByLen[len])];
    }
    const bingoUnique = [...new Set(bingoWords)];

    const totalWords = Object.values(wordsByLen).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
    const bucketCount = Object.values(wordsByLen).filter(
      (arr) => arr.length > 0,
    ).length;

    // Keep racks that meet criteria
    if (bingoUnique.length >= 1 && totalWords >= 6 && bucketCount >= 2) {
      // Compute botPicks: top 3 by commonness (lowest letterScore), length 4-6
      const candidates4To6: Array<{ word: string; score: number }> = [];
      for (const len of ['4', '5', '6']) {
        if (wordsByLen[len]) {
          for (const w of wordsByLen[len]) {
            candidates4To6.push({ word: w, score: letterScore(w) });
          }
        }
      }
      candidates4To6.sort((a, b) => a.score - b.score);
      const botPicks: string[] = [];
      const seenWords = new Set<string>();
      for (const { word } of candidates4To6) {
        if (botPicks.length >= 3) break;
        if (!seenWords.has(word)) {
          botPicks.push(word);
          seenWords.add(word);
        }
      }

      if (botPicks.length > 0) {
        candidates.push({
          letters: rackLetters,
          bingoWords: bingoUnique,
          wordsByLen,
          botPicks,
        });
      }
    }
  }

  console.log(`[${lang}] Found ${candidates.length} valid racks`);

  // Sort by bingo count (desc)
  candidates.sort((a, b) => b.bingoWords.length - a.bingoWords.length);

  // Self-verify each rack
  for (const rack of candidates) {
    // Check 7 letters
    if (rack.letters.length !== 7)
      throw new Error(`Rack ${rack.letters} not 7 letters`);

    // Check bingo words
    if (rack.bingoWords.length === 0)
      throw new Error(`Rack ${rack.letters} has no bingo words`);
    for (const w of rack.bingoWords) {
      if (w.length !== 7) throw new Error(`Bingo ${w} is not 7 letters`);
      if (!canFormFromRack(w, rack.letters))
        throw new Error(`Bingo ${w} not formable from ${rack.letters}`);
    }

    // Check word coverage
    const totalWords = Object.values(rack.wordsByLen).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
    if (totalWords < 6)
      throw new Error(`Rack ${rack.letters} has only ${totalWords} words`);

    const bucketCount = Object.values(rack.wordsByLen).filter(
      (arr) => arr.length > 0,
    ).length;
    if (bucketCount < 2)
      throw new Error(`Rack ${rack.letters} has only ${bucketCount} buckets`);

    // Check botPicks
    if (rack.botPicks.length === 0)
      throw new Error(`Rack ${rack.letters} has no botPicks`);
    for (const w of rack.botPicks) {
      if (!canFormFromRack(w, rack.letters))
        throw new Error(`BotPick ${w} not formable from ${rack.letters}`);
    }
  }

  console.log(
    `[${lang}] Self-verified ${candidates.length} racks (first: ${candidates[0]?.letters} with ${candidates[0]?.bingoWords.length} bingos)`,
  );

  return candidates;
}

async function main() {
  console.log('Sealed Bid Rack Generator (Hand-Seeded)');
  console.log('======================================\n');

  const result: Record<string, GeneratedRack[]> = {};

  // Generate English racks
  const enWords = loadWordsForLang('en');
  const enRacks = await generateRacksForLang(
    HAND_SEEDED_RACKS.en,
    enWords,
    'en',
  );
  result.en = enRacks;

  // Generate Hebrew racks - auto-extract 7-letter seeds if needed
  const heWords = loadWordsForLang('he');
  if (HAND_SEEDED_RACKS.he.length === 0 && heWords.length > 0) {
    // Auto-extract 7-letter words as seeds (take every 100th word to spread coverage)
    const heSeeds = [];
    for (let i = 0; i < heWords.length && heSeeds.length < 12; i += Math.max(1, Math.floor(heWords.length / 20))) {
      if (heWords[i]!.length === 7) {
        heSeeds.push(heWords[i]!);
      }
    }
    // If we don't have enough 7-letter words, try collecting them directly
    if (heSeeds.length < 8) {
      console.log(`[he] Only found ${heSeeds.length} 7-letter word seeds, collecting more...`);
      const heWordSet = new Set<string>();
      for (const w of heWords) {
        if (w.length === 7 && heWordSet.size < 20) {
          heWordSet.add(w);
        }
      }
      HAND_SEEDED_RACKS.he = Array.from(heWordSet);
    } else {
      HAND_SEEDED_RACKS.he = heSeeds;
    }
  }

  const heRacks = await generateRacksForLang(
    HAND_SEEDED_RACKS.he,
    heWords,
    'he',
  );
  result.he = heRacks;

  // Ensure minimum pool sizes
  if (result.en.length < 8 || result.he.length < 8) {
    console.warn(
      `Warning: pools smaller than recommended (en: ${result.en.length}, he: ${result.he.length})`,
    );
  }

  // Write JSON
  const outputPath = path.join(
    __dirname,
    '../lib/sealedBid/sp/data/sealedBidRacks.generated.json',
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

  console.log(`\nWrote ${outputPath}`);
  console.log(
    `Pool sizes: en=${result.en.length} racks, he=${result.he.length} racks`,
  );

  // Show sample
  if (result.en.length > 0) {
    const sample = result.en[0]!;
    console.log(
      `\nSample EN rack: ${sample.letters} (${sample.bingoWords.length} bingos, ${Object.values(sample.wordsByLen).reduce((s, a) => s + a.length, 0)} total words)`,
    );
    console.log(`  Bingo examples: ${sample.bingoWords.slice(0, 2).join(', ')}`);
    console.log(`  Bot picks: ${sample.botPicks.join(', ')}`);
  }

  if (result.he.length > 0) {
    const sample = result.he[0]!;
    console.log(
      `\nSample HE rack: ${sample.letters} (${sample.bingoWords.length} bingos, ${Object.values(sample.wordsByLen).reduce((s, a) => s + a.length, 0)} total words)`,
    );
  }

  console.log('\n✓ Generation complete');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
