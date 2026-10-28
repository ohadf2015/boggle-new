import { getWaveClearReward, getWaveTheme, type BlastWaveThemeId } from '../legacy/utils/blastWaveConfig';
import type { WaveResult } from '../legacy/types';

export interface JourneyNode {
  wave: number;
  themeId: BlastWaveThemeId;
  status: 'cleared' | 'failed';
  stars: 0 | 1 | 2 | 3;
}

export interface JourneyMilestone {
  wave: number;
  themeId: BlastWaveThemeId;
  wavesAway: number;
  rewardMultiplier: number;
  prizeCoins: number;
}

export interface RunJourney {
  nodes: JourneyNode[];
  hiddenBefore: number;
  reachedWave: number;
  wavesCleared: number;
  runStars: number;
  milestone: JourneyMilestone | null;
}

const BOSS_EVERY = 5;

export function buildRunJourney(waveResults: readonly WaveResult[], passPct: number, maxNodes = 5): RunJourney {
  const all: JourneyNode[] = waveResults.map((w, i) => {
    const isFinal = i === waveResults.length - 1;
    const status = !isFinal || w.clearPercentage >= passPct ? 'cleared' : 'failed';
    return {
      wave: w.waveNumber,
      themeId: getWaveTheme(w.waveNumber).id,
      status,
      stars: status === 'cleared' ? (w.reward?.stars ?? 0) : 0,
    };
  });
  if (all.length === 0) {
    return { nodes: [], hiddenBefore: 0, reachedWave: 0, wavesCleared: 0, runStars: 0, milestone: null };
  }

  const reachedWave = all[all.length - 1].wave;
  const bossWave = (Math.floor(reachedWave / BOSS_EVERY) + 1) * BOSS_EVERY;
  const boss = getWaveTheme(bossWave);
  const hiddenBefore = Math.max(0, all.length - maxNodes);

  return {
    nodes: all.slice(hiddenBefore),
    hiddenBefore,
    reachedWave,
    wavesCleared: all.filter((n) => n.status === 'cleared').length,
    runStars: all.reduce((sum, n) => sum + n.stars, 0),
    milestone: {
      wave: bossWave,
      themeId: boss.id,
      wavesAway: bossWave - reachedWave,
      rewardMultiplier: boss.params.rewardMultiplier,
      prizeCoins: getWaveClearReward(bossWave, 1).coins,
    },
  };
}
