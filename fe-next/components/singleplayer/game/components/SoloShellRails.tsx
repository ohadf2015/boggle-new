'use client';

import { memo, useMemo } from 'react';
import { ShellKeysCard, ShellStandings, ShellStats, ShellWordFeed, type ShellStat, type ShellT } from '@/components/game/shell';
import type { FoundWord } from '../types';

interface SoloLeftRailProps {
  t: ShellT;
  score: number;
  bots: ReadonlyArray<{ name: string; score: number }>;
  validWords: readonly FoundWord[];
  streak: number;
  multiplier: number;
}

export const SoloLeftRail = memo(function SoloLeftRail({ t, score, bots, validWords, streak, multiplier }: SoloLeftRailProps) {
  const rows = useMemo(
    () => [
      { id: 'you', name: t('gameShell.you') ?? '', score, isMe: true },
      ...bots.map((b, i) => ({ id: `bot-${i}`, name: b.name, score: b.score })),
    ],
    [t, score, bots],
  );
  const best = useMemo(
    () => validWords.reduce<FoundWord | null>((top, w) => (!top || w.score > top.score ? w : top), null),
    [validWords],
  );
  const stats = useMemo<ShellStat[]>(
    () => [
      { id: 'score', label: t('gameShell.score') ?? '', value: score, tone: 'accent' },
      { id: 'found', label: t('gameShell.found') ?? '', value: validWords.length },
      { id: 'streak', label: t('gameShell.streak') ?? '', value: streak, tone: streak >= 3 ? 'warn' : 'plain' },
      { id: 'multiplier', label: t('gameShell.multiplier') ?? '', value: `×${multiplier.toFixed(multiplier % 1 ? 1 : 0)}`, bumpKey: multiplier },
    ],
    [t, score, validWords.length, streak, multiplier],
  );

  return (
    <>
      {bots.length > 0 && <ShellStandings rows={rows} t={t} />}
      <ShellStats title={t('gameShell.round') ?? ''} stats={stats}>
        {best && (
          <p data-testid="solo-rail-best" className="flex items-baseline justify-between gap-2 border-t-2 border-black/40 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-neo-cream/60">
            <span>{t('gameShell.topWord')}</span>
            <span dir="auto" className="truncate font-neo-display text-base text-neo-yellow">
              {best.word} <span dir="ltr" className="text-neo-cream/70">+{best.score}</span>
            </span>
          </p>
        )}
      </ShellStats>
      <ShellKeysCard t={t} />
    </>
  );
});

export const SoloRightRail = memo(function SoloRightRail({ t, validWords }: { t: ShellT; validWords: readonly FoundWord[] }) {
  const feed = useMemo(() => validWords.slice().reverse().map((w) => ({ word: w.word, score: w.score })), [validWords]);
  return <ShellWordFeed words={feed} t={t} />;
});
