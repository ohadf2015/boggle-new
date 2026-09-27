/**
 * Build-time generator for Sealed Bid rack pool
 * Outputs verified JSON with guaranteed full-rack words (7-letter racks with bingo words)
 */

import * as fs from 'fs';
import * as path from 'path';
import { normalizeHebrewWord } from '../shared/utils/wordNormalization';
import { canFormFromRack, letterScore } from '../lib/sealedBid/sp/sbEngine';

// Load English dictionary from npm package
function loadEnglishWords(): Set<string> {
  const englishWords: string[] = require('an-array-of-english-words');
  return new Set(englishWords.map(w => w.toLowerCase()));
}

// Load Hebrew dictionary from text file
async function loadHebrewWords(): Promise<Set<string>> {
  const hebrewPath = path.join(__dirname, '../backend/hebrew_words.txt');
  try {
    const content = fs.readFileSync(hebrewPath, 'utf-8');
    const words = content
      .split('\n')
      .map(w => w.trim())
      .filter(w => w.length > 0)
      .map(w => normalizeHebrewWord(w));
    return new Set(words);
  } catch (e) {
    console.warn(`Could not load Hebrew words from ${hebrewPath}: ${e}`);
    return new Set();
  }
}

interface Rack {
  letters: string;
  bingoWords: string[];
  wordsByLen: Record<string, string[]>;
  botPicks: string[];
}

/**
 * Canonical rack key: sorted unique letters for deduplication
 */
function rackKey(letters: string): string {
  return [...letters.toUpperCase()].sort().join('');
}

/**
 * Generate racks for a language
 */
function generateRacksForLanguage(wordSet: Set<string>, lang: string): Rack[] {
  console.log(`\n=== ${lang.toUpperCase()} ===`);
  console.log(`Word set size: ${wordSet.size}`);

  // Find all 7-letter words to use as candidate racks
  const sevenLetterWords = Array.from(wordSet).filter(w => w.length === 7);
  console.log(`7-letter words: ${sevenLetterWords.length}`);

  // Collect candidate racks (deduplicated by sorted letters), capped for performance
  const candidatesByKey = new Map<string, string>();

  // Use fixed seed (LCG) to deterministically select a subset of 7-letter words
  // This ensures consistent rack pool across generator runs
  const seed = lang === 'en' ? 12345 : 54321;
  let lcg = seed;
  const lcgNext = () => {
    lcg = (lcg * 1103515245 + 12345) % 2147483648;
    return lcg / 2147483648;
  };

  // Shuffle 7-letter words using LCG
  const shuffled = [...sevenLetterWords];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(lcgNext() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Take first N shuffled words (capped for performance)
  const maxCandidates = 1500; // Process ~1.5k words; with early-stop, should finish in reasonable time
  const toProcess = shuffled.slice(0, maxCandidates);

  for (const word of toProcess) {
    const key = rackKey(word);
    if (!candidatesByKey.has(key)) {
      candidatesByKey.set(key, word.toUpperCase());
    }
  }
  console.log(`Candidate racks (deduped from first ${toProcess.length}): ${candidatesByKey.size}`);

  // For each candidate, compute formable words
  // Early-stop once we have enough valid racks for good coverage
  const allRacks: Rack[] = [];
  const targetRacks = 50; // Try to reach 50 valid racks, stop after
  for (const letters of candidatesByKey.values()) {
    if (allRacks.length >= targetRacks && candidatesByKey.size > 1000) break; // Early stop if we have enough
    const wordsByLen: Record<string, string[]> = {};
    const bingoWords: string[] = [];

    for (const word of wordSet) {
      if (word.length < 3 || word.length > 7) continue;
      const upper = word.toUpperCase();
      if (!canFormFromRack(upper, letters)) continue;

      const len = word.length.toString();
      if (!wordsByLen[len]) wordsByLen[len] = [];
      wordsByLen[len].push(upper);

      if (word.length === 7) {
        bingoWords.push(upper);
      }
    }

    // Filter: keep only racks with >=1 bingo, >=6 total words, >=2 length buckets
    const totalWords = Object.values(wordsByLen).reduce((a, b) => a + b.length, 0);
    const buckets = Object.keys(wordsByLen).filter(k => wordsByLen[k].length > 0);
    if (bingoWords.length >= 1 && totalWords >= 6 && buckets.length >= 2) {
      allRacks.push({ letters, bingoWords, wordsByLen, botPicks: [] });
    }
  }

  console.log(`Valid racks (before botPicks): ${allRacks.length}`);

  // Assign botPicks: prefer length 4-6 with lowest letterScore
  for (const rack of allRacks) {
    const candidates: string[] = [];
    for (const len of ['4', '5', '6']) {
      if (rack.wordsByLen[len]) {
        candidates.push(...rack.wordsByLen[len]);
      }
    }
    // If not enough 4-6 words, add length 3
    if (candidates.length === 0 && rack.wordsByLen['3']) {
      candidates.push(...rack.wordsByLen['3']);
    }

    // Sort by letterScore (ascending = common) and pick top 3 distinct
    const sorted = candidates.sort((a, b) => letterScore(a) - letterScore(b));
    const seen = new Set<string>();
    const picks: string[] = [];
    for (const w of sorted) {
      if (!seen.has(w) && picks.length < 3) {
        picks.push(w);
        seen.add(w);
      }
    }
    rack.botPicks = picks;
  }

  // Sort by bingoWords.length descending and cap at ~40 per language
  allRacks.sort((a, b) => b.bingoWords.length - a.bingoWords.length);
  const capped = allRacks.slice(0, 40);
  console.log(`After botPicks + sort + cap(40): ${capped.length}`);

  // Self-verify: every rack must pass invariants
  for (const [i, rack] of capped.entries()) {
    if (rack.letters.length !== 7) throw new Error(`[${i}] letters length !== 7`);
    if (rack.bingoWords.length < 1) throw new Error(`[${i}] no bingo words`);
    for (const w of rack.bingoWords) {
      if (w.length !== 7) throw new Error(`[${i}] bingo word length !== 7: ${w}`);
      if (!canFormFromRack(w, rack.letters)) throw new Error(`[${i}] bingo not formable: ${w}`);
    }
    const total = Object.values(rack.wordsByLen).reduce((a: number, b: any) => a + b.length, 0);
    const buckets = Object.keys(rack.wordsByLen).filter(k => (rack.wordsByLen[k] as string[]).length > 0);
    if (total < 6) throw new Error(`[${i}] total words < 6: ${total}`);
    if (buckets.length < 2) throw new Error(`[${i}] buckets < 2: ${buckets.length}`);
    if (rack.botPicks.length < 1) throw new Error(`[${i}] botPicks empty`);
    for (const w of rack.botPicks) {
      if (!canFormFromRack(w, rack.letters)) throw new Error(`[${i}] botPick not formable: ${w}`);
    }
  }
  console.log(`✓ All invariants passed for ${capped.length} racks`);

  return capped;
}

async function main() {
  console.log('Generating Sealed Bid Rack Pool...');
  const startTime = Date.now();

  // Load word sets
  const enWords = loadEnglishWords();
  const heWords = await loadHebrewWords();

  // Generate racks
  const enRacks = generateRacksForLanguage(enWords, 'en');
  const heRacks = generateRacksForLanguage(heWords, 'he');

  // Verify we have meaningful pools
  if (enRacks.length < 8) {
    throw new Error(`English pool too small: ${enRacks.length} (need >=8)`);
  }
  console.log(`\n✓ Hebrew pool: ${heRacks.length} racks (fallback to en if < 8)`);

  // Output JSON
  const output = {
    en: enRacks,
    he: heRacks.length >= 8 ? heRacks : enRacks, // Fallback to English if Hebrew too small
  };

  const outPath = path.join(__dirname, '../lib/sealedBid/sp/data/sealedBidRacks.generated.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  const elapsed = Date.now() - startTime;
  console.log(`\n✓ Generated: ${outPath}`);
  console.log(`  en: ${enRacks.length} racks`);
  console.log(`  he: ${heRacks.length} racks (${heRacks.length >= 8 ? 'native' : 'fallback to en'})`);
  console.log(`  Time: ${elapsed}ms`);
}

main().catch(err => {
  console.error('Generator error:', err);
  process.exit(1);
});
