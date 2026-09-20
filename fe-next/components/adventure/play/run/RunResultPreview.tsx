'use client';

/**
 * QA-only preview of the two run-END screens (`?preview=win` / `?preview=over`
 * on /adventure).
 *
 * Reaching the real victory screen means clearing eight map rows against a live
 * `/api/adventure/*`, so for two rounds nobody — reviewer or judge — had ever
 * SEEN it and it was assumed not to exist. This mounts the real components with
 * a fabricated result so the win state can be screenshotted and reviewed.
 *
 * Nothing here is reachable without the query flag, it writes nothing, and it
 * is lazily imported so the flagless path never loads it.
 */
import { buildRunMap, MAP_ROWS } from '@/lib/adventure/play/runMap';
import type { PublicRun } from '@/lib/adventure/play/runToken';
import type { RunResult } from '../runTypes';
import RunCompleteScreen from './RunCompleteScreen';
import RunOverScreen from './RunOverScreen';

const SEED = 'preview-run';

/** A plausible finished run: the act map's own node ids, walked to the top. */
function previewRun(world: number, rows: number): { run: PublicRun; map: ReturnType<typeof buildRunMap> } {
  const map = buildRunMap(SEED, world);
  const path: string[] = [];
  for (let row = 0; row < rows; row++) {
    const node = map.nodes.find((n) => n.row === row);
    if (node) path.push(node.id);
  }
  const run: PublicRun = {
    v: 2, w: world, step: path.length, node: path[path.length - 1] ?? null, path,
    hp: 4, maxHp: 6, relics: ['storm-rune', 'long-bow', 'phoenix-feather'], potions: { heal: 1, time: 0, cleanse: 0, insight: 0 },
    gold: 138, bhp: 1, bh: 1,
  } as unknown as PublicRun;
  return { run, map };
}

const previewResult = (won: boolean): RunResult => ({
  score: 268, stars: 3, bestStars: 3, won, rewards: [], totalStars: 42,
  validWords: ['STORM', 'TRIBE', 'GLADE'], points: [30, 18, 14],
  nodeKind: won ? 'boss' : 'elite',
  runComplete: won, runOver: !won,
  xpGained: 120, coinsGained: 45, leaderboardPoints: 22,
  streak: { current: 4, longest: 9 },
  levelUp: { newLevel: 12, levelsGained: 1, newTitles: [] },
  achievementsUnlocked: [],
});

interface Props {
  world: number;
  won: boolean;
  /** Hearts left, so the flawless line can be previewed too. */
  hp?: number;
  onExit: () => void;
  onEquipSkin: (world: number) => void;
}

export default function RunResultPreview({ world, won, hp = 4, onExit, onEquipSkin }: Props) {
  const { run, map } = previewRun(world, won ? MAP_ROWS : MAP_ROWS - 2);
  const result = previewResult(won);
  return (
    <div className="relative min-h-dvh bg-[#0f1b3d]">
      {won ? (
        <RunCompleteScreen world={world} result={result} run={run} map={map} hpLeft={hp} maxHp={run.maxHp} runWords={19}
          runBest={{ word: 'STORMLIT', pts: 34 }} hasNext onNext={onExit} onMap={onExit} onEquipSkin={onEquipSkin} />
      ) : (
        <RunOverScreen result={result} run={run} map={map} runWords={11}
          runBest={{ word: 'STORMLIT', pts: 34 }} onRestartRun={onExit} onMap={onExit} />
      )}
    </div>
  );
}
