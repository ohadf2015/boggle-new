'use client';

import { BookOpen, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { GameResultsHero, type ResultsBadge } from '@/components/results/stage/GameResultsHero';
import type { ResultsAvatar } from '@/components/results/stage/ResultsAvatarStage';
import type { ResultsStatItem } from '@/components/results/stage/ResultsStatCards';

const SOLO_ACCENT = '#22d3ee';

interface SoloResultsHeroProps {
  title: string;
  subtitle?: string;
  score: number;
  words: number;
  avatar: ResultsAvatar;
  rank: number;
  totalPlayers: number;
  isNewHighScore: boolean;
  /** Valid words, best first: the best-word tile and the top-three chip row. */
  topWords?: string[];
}

export function SoloResultsHero({
  title,
  subtitle,
  score,
  words,
  avatar,
  rank,
  totalPlayers,
  isNewHighScore,
  topWords = [],
}: SoloResultsHeroProps) {
  const { t } = useLanguage();
  const badges: ResultsBadge[] = [];
  if (isNewHighScore) badges.push({ key: 'best', label: `★ ${t('quickPlay.solo.newBest')}`, tone: 'yellow' });
  // "#1 of 1" brags about nothing, so a lone round shows no placement.
  if (totalPlayers > 1) badges.push({ key: 'rank', label: `#${rank} ${t('results.of')} ${totalPlayers}`, tone: rank === 1 ? 'lime' : 'pink' });

  // Coins earned live on the one reward line under the hero, not a third tile.
  const stats: ResultsStatItem[] = [
    { key: 'score', label: t('quickPlay.solo.statScore', 'Score'), value: score, tone: 'yellow', icon: <Zap className="h-5 w-5 fill-current" strokeWidth={2.5} /> },
    { key: 'words', label: t('results.words'), value: words, tone: 'cyan', icon: <BookOpen className="h-5 w-5" strokeWidth={2.75} /> },
    { key: 'best', label: t('mpUi.results.bestWord'), value: 0, tone: 'lime', display: topWords[0] ?? t('mpUi.results.bestWordNone') },
  ];

  return (
    <GameResultsHero
      title={title}
      subtitle={subtitle}
      avatar={avatar}
      accentHex={SOLO_ACCENT}
      cheering={score > 0}
      bigMoment={isNewHighScore || (totalPlayers > 1 && rank === 1)}
      badges={badges}
      stats={stats}
      focusHeading
    >
      {topWords.length > 1 && (
        <ul className="flex flex-wrap justify-center gap-2" aria-label={t('mpUi.results.bestWord')}>
          {topWords.slice(0, 3).map((w, i) => (
            <li
              key={w}
              data-testid="results-top-word"
              dir="auto"
              style={{ animationDelay: `${1.4 + i * 0.12}s` }}
              className="animate-neo-pop rounded-full border-2 border-neo-black bg-neo-lime px-3 py-1 font-neo-display text-sm font-bold uppercase text-neo-black shadow-hard-sm motion-reduce:animate-none"
            >
              {w}
            </li>
          ))}
        </ul>
      )}
    </GameResultsHero>
  );
}
