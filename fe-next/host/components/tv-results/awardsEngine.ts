import {
  Zap, Target, BookOpen, Crown, Star, Dumbbell,
  Sparkles, Flame, TrendingUp, Compass, Activity, Scissors, Brain, Users,
  type LucideIcon,
} from 'lucide-react';
import type { Avatar as AvatarType } from '@/shared/types/game';

// Extended WordDetail with timing info (available in final scores)
interface WordDetailWithTiming {
  word: string;
  score: number;
  validated: boolean;
  isDuplicate: boolean;
  comboBonus?: number;
  comboLevel?: number;
  fireRoundBonus?: number;
  fireRoundMultiplier?: number;
  timeSinceStart?: number;
  timestamp?: number;
}

export interface AwardPlayer {
  username: string;
  score: number;
  avatar?: AvatarType | null;
  allWords?: WordDetailWithTiming[];
}

export interface Award {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  recipient: {
    username: string;
    avatar?: AvatarType | null;
  };
  value: string | number;
  color: string;
}

type Translate = (path: string, params?: Record<string, string | number>) => string;

export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Calculates every award the round earned, then picks 3 with a seeded shuffle so a replay shows the same set. */
export function computeAwards(players: AwardPlayer[], gameDuration: number, t: Translate, seed: number): Award[] {
  if (!players || players.length === 0) return [];

  const allAwards: Award[] = [];
  const awardedPlayers = new Set<string>();

  // Mark top 3 as already having podium awards
  const sortedByScore = [...players].sort((a, b) => b.score - a.score);
  sortedByScore.slice(0, 3).forEach(p => awardedPlayers.add(p.username));

  // Helper: find best candidate not already awarded
  const findBestCandidate = (
    candidates: { player: AwardPlayer; value: number }[]
  ): { player: AwardPlayer; value: number } | null => {
    const sorted = [...candidates].sort((a, b) => b.value - a.value);
    const eligible = sorted.find(c => !awardedPlayers.has(c.player.username));
    if (eligible) return eligible;
    return sorted[0] || null;
  };

  // Build shared word frequency map (used by multiple awards)
  const wordCounts = new Map<string, number>();
  players.forEach(player => {
    player.allWords?.forEach(w => {
      if (w.validated) {
        const word = w.word.toLowerCase();
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    });
  });

  // --- AWARD 1: Lightning Fingers - Fastest first word ---
  const firstWords = players
    .map(player => {
      const firstWord = player.allWords
        ?.filter(w => w.validated && w.timeSinceStart !== undefined)
        .sort((a, b) => (a.timeSinceStart || 999) - (b.timeSinceStart || 999))[0];
      return { player, value: firstWord?.timeSinceStart || 999 };
    })
    .filter(p => p.value < 999)
    .sort((a, b) => a.value - b.value);

  if (firstWords.length > 0) {
    const winner = firstWords.find(c => !awardedPlayers.has(c.player.username)) || firstWords[0];
    allAwards.push({
      id: 'lightning-fingers',
      icon: Zap,
      title: t('tvResults.lightningFingers'),
      description: t('tvResults.fastestFirstWord'),
      recipient: { username: winner.player.username, avatar: winner.player.avatar },
      value: `${winner.value.toFixed(1)}s`,
      color: 'bg-neo-yellow',
    });
    awardedPlayers.add(winner.player.username);
  }

  // --- AWARD 2: Sharp Shooter - Highest accuracy (min 5 words) ---
  const accuracyStats = players
    .map(player => {
      const validWords = player.allWords?.filter(w => w.validated).length || 0;
      const totalWords = player.allWords?.length || 0;
      const accuracy = totalWords >= 5 ? (validWords / totalWords) * 100 : 0;
      return { player, value: accuracy };
    })
    .filter(p => p.value > 0);

  const accuracyWinner = findBestCandidate(accuracyStats);
  if (accuracyWinner && accuracyWinner.value >= 50) {
    allAwards.push({
      id: 'sharp-shooter',
      icon: Target,
      title: t('tvResults.sharpShooter'),
      description: t('tvResults.highestAccuracy'),
      recipient: { username: accuracyWinner.player.username, avatar: accuracyWinner.player.avatar },
      value: `${Math.round(accuracyWinner.value)}%`,
      color: 'bg-neo-lime',
    });
    awardedPlayers.add(accuracyWinner.player.username);
  }

  // --- AWARD 3: Word Wizard - Most 6+ letter words ---
  const longWordStats = players.map(player => {
    const longWords = player.allWords?.filter(w => w.validated && w.word.length >= 6).length || 0;
    return { player, value: longWords };
  });

  const wordWizard = findBestCandidate(longWordStats);
  if (wordWizard && wordWizard.value >= 3) {
    allAwards.push({
      id: 'word-wizard',
      icon: BookOpen,
      title: t('tvResults.wordWizard'),
      description: t('tvResults.mostLongWords'),
      recipient: { username: wordWizard.player.username, avatar: wordWizard.player.avatar },
      value: wordWizard.value,
      color: 'bg-neo-purple',
    });
    awardedPlayers.add(wordWizard.player.username);
  }

  // --- AWARD 4: Combo King - Highest combo streak ---
  const comboStats = players.map(player => {
    const maxCombo = player.allWords?.reduce((max, w) => Math.max(max, w.comboLevel || 0), 0) || 0;
    return { player, value: maxCombo };
  });

  const comboKing = findBestCandidate(comboStats);
  if (comboKing && comboKing.value >= 5) {
    allAwards.push({
      id: 'combo-king',
      icon: Crown,
      title: t('tvResults.comboKing'),
      description: t('tvResults.bestComboStreak'),
      recipient: { username: comboKing.player.username, avatar: comboKing.player.avatar },
      value: `${comboKing.value}x`,
      color: 'bg-neo-orange',
    });
    awardedPlayers.add(comboKing.player.username);
  }

  // --- AWARD 5: Lone Wolf - Most unique words ---
  const uniqueWordStats = players.map(player => {
    const uniqueCount = player.allWords?.filter(w => {
      if (!w.validated) return false;
      return wordCounts.get(w.word.toLowerCase()) === 1;
    }).length || 0;
    return { player, value: uniqueCount };
  });

  const loneWolf = findBestCandidate(uniqueWordStats);
  if (loneWolf && loneWolf.value >= 3) {
    allAwards.push({
      id: 'lone-wolf',
      icon: Star,
      title: t('tvResults.loneWolf'),
      description: t('tvResults.mostUniqueFinds'),
      recipient: { username: loneWolf.player.username, avatar: loneWolf.player.avatar },
      value: loneWolf.value,
      color: 'bg-neo-cyan',
    });
    awardedPlayers.add(loneWolf.player.username);
  }

  // --- AWARD 6: Clutch Player - Most words in final 30 seconds ---
  const clutchStats = players.map(player => {
    const clutchThreshold = Math.max(0, gameDuration - 30);
    const clutchWords = player.allWords?.filter(w => {
      if (!w.validated || w.timeSinceStart === undefined) return false;
      return w.timeSinceStart >= clutchThreshold;
    }).length || 0;
    return { player, value: clutchWords };
  });

  const clutchPlayer = findBestCandidate(clutchStats);
  if (clutchPlayer && clutchPlayer.value >= 3) {
    allAwards.push({
      id: 'clutch-player',
      icon: Dumbbell,
      title: t('tvResults.clutchPlayer'),
      description: t('tvResults.strongFinisher'),
      recipient: { username: clutchPlayer.player.username, avatar: clutchPlayer.player.avatar },
      value: `${clutchPlayer.value} ${t('tvResults.words')}`,
      color: 'bg-neo-pink',
    });
    awardedPlayers.add(clutchPlayer.player.username);
  }

  // --- AWARD 7: Vocabulary Virtuoso - Longest single word ---
  const longestWordStats = players.map(player => {
    const longest = player.allWords
      ?.filter(w => w.validated)
      .reduce((max, w) => w.word.length > max ? w.word.length : max, 0) || 0;
    return { player, value: longest };
  });

  const vocabVirtuoso = findBestCandidate(longestWordStats);
  if (vocabVirtuoso && vocabVirtuoso.value >= 5) {
    allAwards.push({
      id: 'vocabulary-virtuoso',
      icon: Sparkles,
      title: t('tvResults.vocabularyVirtuoso'),
      description: t('tvResults.longestSingleWord'),
      recipient: { username: vocabVirtuoso.player.username, avatar: vocabVirtuoso.player.avatar },
      value: `${vocabVirtuoso.value} ${t('tvResults.letters')}`,
      color: 'bg-neo-yellow',
    });
    awardedPlayers.add(vocabVirtuoso.player.username);
  }

  // --- AWARD 8: Speed Demon - Highest words-per-minute rate ---
  const wpmStats = players.map(player => {
    const validWords = player.allWords?.filter(w => w.validated).length || 0;
    const wpm = gameDuration > 0 ? (validWords / gameDuration) * 60 : 0;
    return { player, value: wpm };
  }).filter(p => p.value > 0);

  const speedDemon = findBestCandidate(wpmStats);
  if (speedDemon && speedDemon.value >= 2) {
    allAwards.push({
      id: 'speed-demon',
      icon: Flame,
      title: t('tvResults.speedDemon'),
      description: t('tvResults.highestWpm'),
      recipient: { username: speedDemon.player.username, avatar: speedDemon.player.avatar },
      value: `${speedDemon.value.toFixed(1)} ${t('tvResults.wpm')}`,
      color: 'bg-neo-orange',
    });
    awardedPlayers.add(speedDemon.player.username);
  }

  // --- AWARD 9: Comeback Kid - Biggest score improvement last 60s vs first 60s ---
  const comebackStats = players.map(player => {
    const words = player.allWords?.filter(w => w.validated && w.timeSinceStart !== undefined) || [];
    const first60 = words.filter(w => (w.timeSinceStart || 0) < 60).reduce((s, w) => s + w.score, 0);
    const last60Start = Math.max(0, gameDuration - 60);
    const last60 = words.filter(w => (w.timeSinceStart || 0) >= last60Start).reduce((s, w) => s + w.score, 0);
    const improvement = last60 - first60;
    return { player, value: improvement };
  }).filter(p => p.value > 0);

  const comebackKid = findBestCandidate(comebackStats);
  if (comebackKid && comebackKid.value >= 10) {
    allAwards.push({
      id: 'comeback-kid',
      icon: TrendingUp,
      title: t('tvResults.comebackKid'),
      description: t('tvResults.biggestImprovement'),
      recipient: { username: comebackKid.player.username, avatar: comebackKid.player.avatar },
      value: `+${comebackKid.value} ${t('tvResults.pts')}`,
      color: 'bg-neo-lime',
    });
    awardedPlayers.add(comebackKid.player.username);
  }

  // --- AWARD 10: Explorer - Most variety in word lengths ---
  const explorerStats = players.map(player => {
    const lengths = new Set(
      player.allWords?.filter(w => w.validated).map(w => w.word.length) || []
    );
    return { player, value: lengths.size };
  });

  const explorer = findBestCandidate(explorerStats);
  if (explorer && explorer.value >= 4) {
    allAwards.push({
      id: 'explorer',
      icon: Compass,
      title: t('tvResults.explorer'),
      description: t('tvResults.mostVariety'),
      recipient: { username: explorer.player.username, avatar: explorer.player.avatar },
      value: `${explorer.value} ${t('tvResults.lengths')}`,
      color: 'bg-neo-purple',
    });
    awardedPlayers.add(explorer.player.username);
  }

  // --- AWARD 11: Steady Eddie - Most consistent submission pace ---
  const steadyStats = players.map(player => {
    const times = (player.allWords || [])
      .filter(w => w.validated && w.timeSinceStart !== undefined)
      .map(w => w.timeSinceStart!)
      .sort((a, b) => a - b);
    if (times.length < 5) return { player, value: Infinity };
    const gaps: number[] = [];
    for (let i = 1; i < times.length; i++) {
      gaps.push(times[i] - times[i - 1]);
    }
    const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const variance = gaps.reduce((s, g) => s + (g - mean) ** 2, 0) / gaps.length;
    const stdDev = Math.sqrt(variance);
    // Lower stdDev = more consistent; invert for findBestCandidate (higher = better)
    return { player, value: stdDev > 0 ? 1 / stdDev : 0 };
  }).filter(p => p.value > 0 && p.value < Infinity);

  const steadyEddie = findBestCandidate(steadyStats);
  if (steadyEddie) {
    const stdDev = 1 / steadyEddie.value;
    allAwards.push({
      id: 'steady-eddie',
      icon: Activity,
      title: t('tvResults.steadyEddie'),
      description: t('tvResults.mostConsistent'),
      recipient: { username: steadyEddie.player.username, avatar: steadyEddie.player.avatar },
      value: `${stdDev.toFixed(1)}s`,
      color: 'bg-neo-cyan',
    });
    awardedPlayers.add(steadyEddie.player.username);
  }

  // --- AWARD 12: Short & Sweet - Most 3-letter words (min 5 to qualify) ---
  const shortStats = players.map(player => {
    const shortWords = player.allWords?.filter(w => w.validated && w.word.length === 3).length || 0;
    return { player, value: shortWords };
  });

  const shortSweet = findBestCandidate(shortStats);
  if (shortSweet && shortSweet.value >= 5) {
    allAwards.push({
      id: 'short-and-sweet',
      icon: Scissors,
      title: t('tvResults.shortAndSweet'),
      description: t('tvResults.most3LetterWords'),
      recipient: { username: shortSweet.player.username, avatar: shortSweet.player.avatar },
      value: shortSweet.value,
      color: 'bg-neo-pink',
    });
    awardedPlayers.add(shortSweet.player.username);
  }

  // --- AWARD 13: Big Brain - Highest average word score (min 5 words) ---
  const avgScoreStats = players.map(player => {
    const validWords = player.allWords?.filter(w => w.validated) || [];
    if (validWords.length < 5) return { player, value: 0 };
    const avg = validWords.reduce((s, w) => s + w.score, 0) / validWords.length;
    return { player, value: avg };
  }).filter(p => p.value > 0);

  const bigBrain = findBestCandidate(avgScoreStats);
  if (bigBrain && bigBrain.value >= 3) {
    allAwards.push({
      id: 'big-brain',
      icon: Brain,
      title: t('tvResults.bigBrain'),
      description: t('tvResults.highestAvgScore'),
      recipient: { username: bigBrain.player.username, avatar: bigBrain.player.avatar },
      value: `${bigBrain.value.toFixed(1)} ${t('tvResults.pts')}`,
      color: 'bg-neo-yellow',
    });
    awardedPlayers.add(bigBrain.player.username);
  }

  // --- AWARD 14: Social Butterfly - Most words also found by 3+ others ---
  const socialStats = players.map(player => {
    const socialWords = player.allWords?.filter(w => {
      if (!w.validated) return false;
      return (wordCounts.get(w.word.toLowerCase()) || 0) >= 4; // 3+ others = 4+ total
    }).length || 0;
    return { player, value: socialWords };
  });

  const socialButterfly = findBestCandidate(socialStats);
  if (socialButterfly && socialButterfly.value >= 3) {
    allAwards.push({
      id: 'social-butterfly',
      icon: Users,
      title: t('tvResults.socialButterfly'),
      description: t('tvResults.mostSharedWords'),
      recipient: { username: socialButterfly.player.username, avatar: socialButterfly.player.avatar },
      value: socialButterfly.value,
      color: 'bg-neo-lime',
    });
    awardedPlayers.add(socialButterfly.player.username);
  }

  // Randomly select 3 from the pool using seeded RNG for variety
  if (allAwards.length <= 3) return allAwards;

  const rng = seededRandom(seed);
  const shuffled = [...allAwards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 3);
}
