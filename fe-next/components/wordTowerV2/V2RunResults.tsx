'use client';

import type { Language } from '@/types';
import type { BiomeId } from '@/lib/wordTowerV2/biomes';
import { totalScore } from '@/lib/wordTowerV2/run';
import { v2ShareCardPath } from '@/lib/wordTowerV2/shareCard';
import { NextQuestCta } from '@/components/daily/results/NextQuestCta';
import { V2Results } from './V2Results';
import { DailyTowerBoard } from './DailyTowerBoard';
import { EstateButton } from './estate/EstateButton';
import { type PayoutStatus, towerBlocksFrom } from './rewards/useRunPayout';
import type { DailyTowerApi } from './useDailyTower';
import type { UseEstate } from './useEstate';
import type { useTowerRun } from './useTowerRun';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  language: string;
  game: ReturnType<typeof useTowerRun>;
  estateApi: UseEstate;
  payoutStatus: PayoutStatus;
  daily: boolean;
  dailyTower: DailyTowerApi;
  dailyRank: number | null;
  dailyDateFormatted?: string;
  biomeId: BiomeId;
  playerName: string;
  longestWord: string;
  rivalName: string;
  celebrate: boolean;
  reducedMotion: boolean;
  onRestart: () => void;
  onHome: () => void;
  onClose: () => void;
  onSmash?: () => void;
  onShare?: () => void;
  onRaidOpen: (open: boolean) => void;
  onOpenDistrict: () => void;
}

/** The end-of-run board, wired to the run, the empire and (on daily) the day's board. */
export function V2RunResults({ t, language, game, estateApi, daily, dailyTower, ...p }: Props) {
  const { run } = game;
  return (
    <V2Results
      t={t}
      peakM={game.peakM}
      score={Math.round(totalScore(game.peakM, run.bonus) * estateApi.perks.scoreMult)}
      bestM={game.bestM}
      isBest={game.newBest || game.peakM >= game.bestM - 0.01}
      run={run}
      badges={game.runBadges}
      unlocked={game.unlockedRef.current}
      stats={game.statsRef.current}
      payoutStatus={p.payoutStatus}
      onRestart={p.onRestart}
      onHome={p.onHome}
      onClose={p.onClose}
      celebrate={p.celebrate}
      dateLabel={p.dailyDateFormatted}
      bestWord={p.longestWord}
      smashLabel={t('wordTowerV2.wreck.smash', { name: p.rivalName })}
      onSmash={p.onSmash}
      onShare={p.onShare}
      boardSlot={daily ? <DailyTowerBoard t={t} language={language} refreshKey={dailyTower.growthM} /> : undefined}
      nextSlot={
        daily ? <NextQuestCta justFinished="word-tower" currentLanguage={language as Language} source="word_tower_results" /> : undefined
      }
      recapSrc={v2ShareCardPath({
        heightM: game.peakM,
        floors: run.floors,
        biome: p.biomeId,
        topWord: p.longestWord,
        name: p.playerName,
      })}
      daily={
        daily
          ? { growthM: dailyTower.growthM, targetM: dailyTower.targetM, totalM: dailyTower.totalM, rank: p.dailyRank }
          : undefined
      }
      rivals={{
        estate: estateApi,
        balls: run.balls,
        reducedMotion: p.reducedMotion,
        myTower: towerBlocksFrom(game.worldRef.current, game.labelsRef.current),
        onRaidOpen: p.onRaidOpen,
      }}
      extra={
        <EstateButton t={t} estate={estateApi.estate} raids={estateApi.inbox.length} variant="panel" onOpen={p.onOpenDistrict} />
      }
    />
  );
}
