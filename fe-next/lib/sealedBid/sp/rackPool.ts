import racksJson from './data/sealedBidRacks.generated.json';
import { mulberry32, hashString } from '../../../utils/dailyChallenge/prng';

export interface SbRackDeal { rack: string; displayLetters: string[]; bingoWords: string[]; botPicks: string[]; }
type Raw = { letters: string; bingoWords: string[]; botPicks: string[]; wordsByLen: Record<string, string[]> };
const POOLS = racksJson as Record<string, Raw[]>;

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function dealRounds(count: number, lang: string, seed: string): SbRackDeal[] {
  const pool = POOLS[lang]?.length ? POOLS[lang] : POOLS.en;
  const rnd = mulberry32(hashString(`${lang}:${seed}`));
  const order = shuffle(pool.map((_, i) => i), rnd);
  const picks = order.slice(0, Math.min(count, pool.length));
  // if pool smaller than count, wrap
  while (picks.length < count) picks.push(order[picks.length % order.length]);
  return picks.map((idx) => {
    const raw = pool[idx];
    return {
      rack: raw.letters,
      displayLetters: shuffle([...raw.letters], rnd),
      bingoWords: raw.bingoWords,
      botPicks: raw.botPicks,
    };
  });
}
