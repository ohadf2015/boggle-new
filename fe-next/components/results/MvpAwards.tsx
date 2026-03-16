'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Zap, Sparkles, Target, Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import useReducedMotion from '@/hooks/useReducedMotion';
import type { Player, WordObject } from './types';

// ==========================================
// MVP AWARD COMPUTATION
// ==========================================

interface MvpAward {
  id: string;
  icon: React.ReactNode;
  labelKey: string;
  username: string;
  value: string;
}

function computeMvpAwards(
  players: Player[],
  allPlayerWords: Record<string, WordObject[]>,
): MvpAward[] {
  if (players.length < 2) return [];

  const awards: MvpAward[] = [];
  const awarded = new Set<string>();

  // 1. Longest Word
  let longestWord = '';
  let longestPlayer = '';
  for (const p of players) {
    const words = allPlayerWords[p.username] || [];
    for (const w of words) {
      if (w.validated && !w.isDuplicate && w.word.length > longestWord.length) {
        longestWord = w.word;
        longestPlayer = p.username;
      }
    }
  }
  if (longestPlayer && longestWord.length >= 4) {
    awards.push({
      id: 'longest',
      icon: <BookOpen className="w-4 h-4" />,
      labelKey: 'results.mvp.longestWord',
      username: longestPlayer,
      value: longestWord.toUpperCase(),
    });
    awarded.add(longestPlayer);
  }

  // 2. Combo King — highest total combo bonus
  let bestCombo = 0;
  let comboPlayer = '';
  for (const p of players) {
    const words = allPlayerWords[p.username] || [];
    const totalCombo = words.reduce((s, w) => s + (w.comboBonus || 0), 0);
    if (totalCombo > bestCombo) {
      bestCombo = totalCombo;
      comboPlayer = p.username;
    }
  }
  if (comboPlayer && bestCombo > 0 && !awarded.has(comboPlayer)) {
    awards.push({
      id: 'combo',
      icon: <Flame className="w-4 h-4" />,
      labelKey: 'results.mvp.comboKing',
      username: comboPlayer,
      value: `+${bestCombo}`,
    });
    awarded.add(comboPlayer);
  }

  // 3. Most Unique — words nobody else found
  let bestUnique = 0;
  let uniquePlayer = '';
  for (const p of players) {
    const words = allPlayerWords[p.username] || [];
    let uniqueCount = 0;
    for (const w of words) {
      if (!w.validated || w.isDuplicate) continue;
      const foundByOthers = players.some(
        (other) =>
          other.username !== p.username &&
          (allPlayerWords[other.username] || []).some(
            (ow) => ow.word === w.word && ow.validated && !ow.isDuplicate
          )
      );
      if (!foundByOthers) uniqueCount++;
    }
    if (uniqueCount > bestUnique) {
      bestUnique = uniqueCount;
      uniquePlayer = p.username;
    }
  }
  if (uniquePlayer && bestUnique >= 2 && !awarded.has(uniquePlayer)) {
    awards.push({
      id: 'unique',
      icon: <Sparkles className="w-4 h-4" />,
      labelKey: 'results.mvp.uniqueFinder',
      username: uniquePlayer,
      value: `${bestUnique}`,
    });
    awarded.add(uniquePlayer);
  }

  // 4. Accuracy Star — highest valid/total ratio (min 5 words)
  let bestAccuracy = 0;
  let accuracyPlayer = '';
  for (const p of players) {
    const words = allPlayerWords[p.username] || [];
    if (words.length < 5) continue;
    const valid = words.filter((w) => w.validated && !w.isDuplicate).length;
    const acc = valid / words.length;
    if (acc > bestAccuracy && !awarded.has(p.username)) {
      bestAccuracy = acc;
      accuracyPlayer = p.username;
    }
  }
  if (accuracyPlayer && bestAccuracy >= 0.7) {
    awards.push({
      id: 'accuracy',
      icon: <Target className="w-4 h-4" />,
      labelKey: 'results.mvp.accuracyStar',
      username: accuracyPlayer,
      value: `${Math.round(bestAccuracy * 100)}%`,
    });
    awarded.add(accuracyPlayer);
  }

  // 5. Speed Demon — most words found (if timing not available, word count proxy)
  let mostWords = 0;
  let speedPlayer = '';
  for (const p of players) {
    const words = allPlayerWords[p.username] || [];
    const valid = words.filter((w) => w.validated && !w.isDuplicate).length;
    if (valid > mostWords && !awarded.has(p.username)) {
      mostWords = valid;
      speedPlayer = p.username;
    }
  }
  if (speedPlayer && mostWords >= 3) {
    awards.push({
      id: 'speed',
      icon: <Zap className="w-4 h-4" />,
      labelKey: 'results.mvp.speedDemon',
      username: speedPlayer,
      value: `${mostWords}`,
    });
  }

  return awards;
}

// ==========================================
// COMPONENT
// ==========================================

interface MvpAwardsProps {
  players: Player[];
  allPlayerWords: Record<string, WordObject[]>;
}

export default function MvpAwards({ players, allPlayerWords }: MvpAwardsProps) {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();

  const awards = useMemo(
    () => computeMvpAwards(players, allPlayerWords),
    [players, allPlayerWords]
  );

  if (awards.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {awards.map((award, i) => (
        <motion.div
          key={award.id}
          initial={reducedMotion ? false : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1, type: 'spring', stiffness: 300, damping: 20 }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 border-2 border-white/10 rounded-neo text-xs"
        >
          <span className="text-neo-yellow">{award.icon}</span>
          <span className="text-neo-cream/60 font-bold uppercase tracking-wide">
            {t(award.labelKey)}
          </span>
          <span className="text-neo-white font-black">{award.username}</span>
          <span className="text-neo-cyan font-bold">{award.value}</span>
        </motion.div>
      ))}
    </div>
  );
}
