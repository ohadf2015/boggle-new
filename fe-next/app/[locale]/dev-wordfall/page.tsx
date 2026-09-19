'use client';
import { useEffect, useState } from 'react';
import { BlastHud } from '@/components/blast/v2/BlastHud';
import { BlastBoard } from '@/components/blast/v2/BlastBoard';
import type { BlastLevel, CellId } from '@/lib/blast/v2/types';

const MODE_COLORS: Record<string, string> = { mythology: '#8B5CF6' };

export default function DevWordfallPage() {
  const [level, setLevel] = useState<BlastLevel | null>(null);
  const [tileIds, setTileIds] = useState<string[][]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    fetch('/api/blast/level?level=28&locale=he&variant=a')
      .then((r) => r.json())
      .then((l: BlastLevel) => {
        setLevel(l);
        setTileIds(l.columns.map((c) => c.tiles.map((_, row) => `c${c.index}-r${row}`)));
      });
  }, [mounted]);

  if (!mounted || !level) return <div className="min-h-dvh bg-[#0b1530] text-white p-4">loading…</div>;

  const modeColor = MODE_COLORS[level.theme] ?? '#ec4899';
  const noop = () => {};
  const noopCell = (_: CellId) => {};

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-[#0b1530] text-white" translate="no">
      <BlastHud
        levelNumber={level.levelNumber}
        coins={6850}
        chestNumber={1}
        chestProgress={0.75}
        chestContents={{ tier: 'wood', coins: 25, boosts: [], avatarPart: null, frameSkin: 'wood' }}
        onShuffle={noop}
        strikeBudget={5}
        strikesUsed={2}
        modeColor={modeColor}
        theme={level.theme}
        targetWords={level.words}
        foundWords={level.words.slice(0, 9)}
        bonusWordCount={4}
        canUndo
        onUndo={noop}
        onHint={noop}
      />
      <div className="relative flex-1 min-h-0 flex items-stretch justify-center pb-[max(0.5rem,env(safe-area-inset-bottom))] px-2">
        <div className="relative w-full max-w-[min(96vw,520px)] h-full mx-auto flex items-stretch justify-center" style={{ zIndex: 10 }}>
          <BlastBoard
            level={level}
            selection={{ kind: 'idle' }}
            invalidShakeKey={0}
            onPointerDown={noopCell}
            onPointerEnter={noopCell}
            onPointerUp={noop}
            modeColor={modeColor}
            tileIds={tileIds}
            boardRows={9}
          />
        </div>
      </div>
    </div>
  );
}
