'use client';

import { memo, useMemo } from 'react';
import { m } from 'framer-motion';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import useReducedMotion from '@/hooks/useReducedMotion';
import type { Player, WordObject } from './types';

// ==========================================
// AWARD DEFINITIONS
// ==========================================

interface AwardDef {
  id: string;
  image: string;
  labelKey: string;
  descKey: string;
  color: string;
  borderColor: string;
}

const AWARD_DEFS: Record<string, AwardDef> = {
  loneWolf: {
    id: 'loneWolf',
    image: '/images/awards/lone-wolf.webp',
    labelKey: 'results.awards.loneWolf',
    descKey: 'results.awards.loneWolfDesc',
    color: 'bg-violet-500/20',
    borderColor: 'border-violet-400',
  },
  wordsmith: {
    id: 'wordsmith',
    image: '/images/awards/wordsmith.webp',
    labelKey: 'results.awards.wordsmith',
    descKey: 'results.awards.wordsmithDesc',
    color: 'bg-pink-500/20',
    borderColor: 'border-pink-400',
  },
  comboKing: {
    id: 'comboKing',
    image: '/images/awards/combo-king.webp',
    labelKey: 'results.awards.comboKing',
    descKey: 'results.awards.comboKingDesc',
    color: 'bg-cyan-500/20',
    borderColor: 'border-cyan-400',
  },
  speedDemon: {
    id: 'speedDemon',
    image: '/images/awards/speed-demon.webp',
    labelKey: 'results.awards.speedDemon',
    descKey: 'results.awards.speedDemonDesc',
    color: 'bg-yellow-500/20',
    borderColor: 'border-yellow-400',
  },
  sniper: {
    id: 'sniper',
    image: '/images/awards/sniper.webp',
    labelKey: 'results.awards.sniper',
    descKey: 'results.awards.sniperDesc',
    color: 'bg-red-500/20',
    borderColor: 'border-red-400',
  },
  copycat: {
    id: 'copycat',
    image: '/images/awards/copycat.webp',
    labelKey: 'results.awards.copycat',
    descKey: 'results.awards.copycatDesc',
    color: 'bg-green-500/20',
    borderColor: 'border-green-400',
  },
  lateBloomer: {
    id: 'lateBloomer',
    image: '/images/awards/late-bloomer.webp',
    labelKey: 'results.awards.lateBloomer',
    descKey: 'results.awards.lateBloomerDesc',
    color: 'bg-orange-500/20',
    borderColor: 'border-orange-400',
  },
  bigFish: {
    id: 'bigFish',
    image: '/images/awards/big-fish.webp',
    labelKey: 'results.awards.bigFish',
    descKey: 'results.awards.bigFishDesc',
    color: 'bg-blue-500/20',
    borderColor: 'border-blue-400',
  },
};

// ==========================================
// AWARD COMPUTATION
// ==========================================

interface MvpAward {
  def: AwardDef;
  username: string;
  value: string;
}

function getValidWords(words: WordObject[]): WordObject[] {
  return words.filter((w) => w.validated && !w.isDuplicate && w.score > 0);
}

export function computeMvpAwards(
  players: Player[],
  allPlayerWords: Record<string, WordObject[]>,
  gameDuration = 180,
): MvpAward[] {
  if (players.length < 2) return [];

  const awards: MvpAward[] = [];
  const awarded = new Set<string>();

  // Helper: pick best player for a metric (skips already-awarded)
  function pickBest(
    metric: (p: Player, words: WordObject[]) => number,
    minThreshold: number,
  ): { username: string; value: number } | null {
    let best = -1;
    let bestPlayer = '';
    for (const p of players) {
      if (awarded.has(p.username)) continue;
      const words = allPlayerWords[p.username] || [];
      const val = metric(p, words);
      if (val > best) {
        best = val;
        bestPlayer = p.username;
      }
    }
    if (bestPlayer && best >= minThreshold) return { username: bestPlayer, value: best };
    return null;
  }

  // 1. Lone Wolf — most words nobody else found
  const uniqueCounts = new Map<string, number>();
  for (const p of players) {
    const words = getValidWords(allPlayerWords[p.username] || []);
    let count = 0;
    for (const w of words) {
      const foundByOthers = players.some(
        (other) =>
          other.username !== p.username &&
          (allPlayerWords[other.username] || []).some(
            (ow) => ow.word === w.word && ow.validated,
          ),
      );
      if (!foundByOthers) count++;
    }
    uniqueCounts.set(p.username, count);
  }
  const loneWolf = pickBest((p) => uniqueCounts.get(p.username) || 0, 2);
  if (loneWolf) {
    awards.push({
      def: AWARD_DEFS.loneWolf,
      username: loneWolf.username,
      value: `${loneWolf.value}`,
    });
    awarded.add(loneWolf.username);
  }

  // 2. Wordsmith — longest word
  let longestWord = '';
  let longestPlayer = '';
  for (const p of players) {
    if (awarded.has(p.username)) continue;
    const words = getValidWords(allPlayerWords[p.username] || []);
    for (const w of words) {
      if (w.word.length > longestWord.length) {
        longestWord = w.word;
        longestPlayer = p.username;
      }
    }
  }
  if (longestPlayer && longestWord.length >= 5) {
    awards.push({
      def: AWARD_DEFS.wordsmith,
      username: longestPlayer,
      value: longestWord.toUpperCase(),
    });
    awarded.add(longestPlayer);
  }

  // 3. Combo King — highest total combo bonus
  const comboKing = pickBest(
    (_p, words) => words.reduce((s, w) => s + (w.comboBonus || 0), 0),
    5,
  );
  if (comboKing) {
    awards.push({
      def: AWARD_DEFS.comboKing,
      username: comboKing.username,
      value: `+${comboKing.value}`,
    });
    awarded.add(comboKing.username);
  }

  // 4. Speed Demon — most valid words submitted
  const speedDemon = pickBest(
    (_p, words) => getValidWords(words).length,
    3,
  );
  if (speedDemon) {
    awards.push({
      def: AWARD_DEFS.speedDemon,
      username: speedDemon.username,
      value: `${speedDemon.value}`,
    });
    awarded.add(speedDemon.username);
  }

  // 5. Sniper — highest accuracy (min 5 words submitted)
  const sniperResult = pickBest(
    (_p, words) => {
      if (words.length < 5) return -1;
      const valid = getValidWords(words).length;
      return valid / words.length;
    },
    0.7,
  );
  if (sniperResult) {
    awards.push({
      def: AWARD_DEFS.sniper,
      username: sniperResult.username,
      value: `${Math.round(sniperResult.value * 100)}%`,
    });
    awarded.add(sniperResult.username);
  }

  // 6. Copycat — most words that were also found by others
  const copycat = pickBest(
    (p, words) => {
      const valid = getValidWords(words);
      let shared = 0;
      for (const w of valid) {
        const foundByOthers = players.some(
          (other) =>
            other.username !== p.username &&
            (allPlayerWords[other.username] || []).some(
              (ow) => ow.word === w.word && ow.validated,
            ),
        );
        if (foundByOthers) shared++;
      }
      return shared;
    },
    3,
  );
  if (copycat) {
    awards.push({
      def: AWARD_DEFS.copycat,
      username: copycat.username,
      value: `${copycat.value}`,
    });
    awarded.add(copycat.username);
  }

  // 7. Late Bloomer — most points in the final third of the game
  const thirdMark = (gameDuration * 2) / 3;
  const lateBloomer = pickBest(
    (_p, words) => {
      const valid = getValidWords(words);
      let lateScore = 0;
      for (const w of valid) {
        if (w.timeSinceStart != null && w.timeSinceStart >= thirdMark) {
          lateScore += w.score;
        }
      }
      return lateScore;
    },
    20,
  );
  if (lateBloomer) {
    awards.push({
      def: AWARD_DEFS.lateBloomer,
      username: lateBloomer.username,
      value: `+${lateBloomer.value}`,
    });
    awarded.add(lateBloomer.username);
  }

  // 8. Big Fish — highest single word score
  const bigFish = pickBest(
    (_p, words) => {
      const valid = getValidWords(words);
      let max = 0;
      for (const w of valid) {
        if (w.score > max) max = w.score;
      }
      return max;
    },
    50,
  );
  if (bigFish) {
    awards.push({
      def: AWARD_DEFS.bigFish,
      username: bigFish.username,
      value: `${bigFish.value}pts`,
    });
    awarded.add(bigFish.username);
  }

  return awards;
}

// ==========================================
// AWARD CARD COMPONENT
// ==========================================

function AwardCard({
  award,
  index,
  reducedMotion,
  t,
}: {
  award: MvpAward;
  index: number;
  reducedMotion: boolean;
  t: (key: string) => string;
}) {
  const { def, username, value } = award;

  return (
    <m.div
      initial={reducedMotion ? false : { opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: 0.3 + index * 0.15,
        type: 'spring',
        stiffness: 260,
        damping: 20,
      }}
      className={`
        relative flex items-center gap-3
        px-3 py-2.5 rounded-neo
        border-3 border-neo-black
        shadow-hard-sm
        ${def.color}
        backdrop-blur-xs
        overflow-hidden
        min-w-0
      `}
    >
      {/* Mascot image */}
      <div className="relative shrink-0 w-12 h-12">
        <Image
          src={def.image}
          alt={t(def.labelKey)}
          width={48}
          height={48}
          className="w-12 h-12 object-contain drop-shadow-lg"
          unoptimized
        />
      </div>

      {/* Text content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-neo-white">
            {t(def.labelKey)}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-sm font-black text-neo-white truncate">
            {username}
          </span>
          <span className={`text-xs font-bold ${def.borderColor.replace('border-', 'text-')}`}>
            {value}
          </span>
        </div>
      </div>

      {/* Decorative corner accent */}
      <div
        className={`absolute top-0 right-0 w-6 h-6 ${def.borderColor.replace('border-', 'bg-')}/20 rounded-bl-neo`}
      />
    </m.div>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export interface MvpAwardsProps {
  players: Player[];
  allPlayerWords: Record<string, WordObject[]>;
  gameDuration?: number;
}

function MvpAwards({
  players,
  allPlayerWords,
  gameDuration = 180,
}: MvpAwardsProps) {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();

  const awards = useMemo(
    () => computeMvpAwards(players, allPlayerWords, gameDuration),
    [players, allPlayerWords, gameDuration],
  );

  if (awards.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Section header */}
      <m.h3
        initial={reducedMotion ? false : { opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="text-xs font-black uppercase tracking-widest text-neo-yellow/80 flex items-center gap-2"
      >
        <span className="w-4 h-0.5 bg-neo-yellow/40 rounded-full" />
        {t('results.awards.title')}
        <span className="w-4 h-0.5 bg-neo-yellow/40 rounded-full" />
      </m.h3>

      {/* Award cards grid — 2 columns on wider, 1 on narrow */}
      <div className="grid grid-cols-1 @sm:grid-cols-2 gap-2">
        {awards.map((award, i) => (
          <AwardCard
            key={award.def.id}
            award={award}
            index={i}
            reducedMotion={reducedMotion}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(MvpAwards);
