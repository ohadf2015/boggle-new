import type { SceneCtx } from '../pixi/sceneCtx';
import { resolveCommitTier, clampTierForCosy, type CommitContext } from './commitTier';
import { planCommitScenes, TIER_TINTS } from './commitPlan';

export interface SpectacleCommitInput {
  ctx: CommitContext;
  placements: ReadonlyArray<{ row: number; col: number; letter: string; value: number }>;
  word: string;
  cosyMode: boolean;
}

/**
 * Orchestrates the per-commit celebration ladder. Routes a `CommitContext`
 * through the tier resolver, applies cosy clamping, then fires the matching
 * Pixi scenes + fullscreen burst + sound. Each scene is imported lazily so
 * SSR + reduced-motion paths never pay the Pixi/GSAP cost.
 *
 * All scene calls are fire-and-forget; failures (e.g. low-end Pixi init bail)
 * are swallowed so a missed visual never wedges the game loop.
 */
export async function playSpectacleCommit(
  sceneCtx: SceneCtx | null,
  input: SpectacleCommitInput,
): Promise<void> {
  if (!sceneCtx) return;

  const rawTier = resolveCommitTier(input.ctx);
  const tier = input.cosyMode ? clampTierForCosy(rawTier) : rawTier;
  const plan = planCommitScenes(tier);
  const tint = TIER_TINTS[tier];
  const cells = input.placements.map((p) => ({ row: p.row, col: p.col }));
  const anchor = cells[Math.floor(cells.length / 2)];

  const swallow = () => {};

  if (plan.wave) {
    const { playWordCommitWave } = await import('../pixi/scenes/wordCommitWave');
    playWordCommitWave(sceneCtx, {
      placements: input.placements,
      totalScore: input.ctx.scoreThisTurn,
    }).catch(swallow);
  }

  if (plan.pathTrace && cells.length >= 2) {
    const { playPathTrace } = await import('../pixi/scenes/pathTrace');
    playPathTrace(sceneCtx, { cells, tint }).catch(swallow);
  }

  if (plan.wordStamp) {
    const { playWordStampSlam } = await import('../pixi/scenes/wordStampSlam');
    playWordStampSlam(sceneCtx, {
      word: input.word,
      score: input.ctx.scoreThisTurn,
      tint,
      anchor,
    }).catch(swallow);
  }

  if (plan.edgeFlash) {
    const { playScreenEdgeFlash } = await import('../pixi/scenes/screenEdgeFlash');
    playScreenEdgeFlash(sceneCtx, tint).catch(swallow);
  }

  if (plan.auroraSweep) {
    const { playAuroraSweep } = await import('../pixi/scenes/auroraSweep');
    playAuroraSweep(sceneCtx).catch(swallow);
  }

  // The existing `playScoreConfetti` doubles for both fullscreen-burst and
  // bingo finale — keep using it as the high-tier capper.
  if (plan.fullscreenBurst) {
    const { playScoreConfetti } = await import('../pixi/scenes/scoreConfetti');
    playScoreConfetti(sceneCtx).catch(swallow);
  }
}
