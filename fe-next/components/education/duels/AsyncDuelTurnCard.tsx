'use client';

/**
 * AsyncDuelTurnCard — an async duel turn that reads like a challenge, not a row
 * in a list.
 *
 * The async lobby used to print `challengeFrom <raw uuid>` and two buttons,
 * with zero interim engagement: submit a turn, wait, refresh, nothing. The card
 * now leads with the one number that makes it a game — the score the other
 * student already put on the board — and gives you something to do while you
 * wait: throw a mascot sticker back.
 *
 * A score of 0 is not a target, it means nobody has played yet; the card says
 * "first move" rather than inviting a student to "beat 0".
 */

import { Swords, Target } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { duelTauntById, type DuelTauntId } from '@/lib/education/duelTaunts';
import { cn } from '@/lib/utils';
import { TauntStickerPicker } from './TauntStickerPicker';

export interface AsyncDuelTurnCardProps {
  duelId: string;
  opponentName: string;
  lessonName: string;
  /** The opponent's score on this duel — 0 means they have not played yet. */
  opponentScore: number;
  /** Sticker this device already sent for this duel. */
  sentTaunt?: DuelTauntId | null;
  /** Sticker the opponent threw at you (live, over the socket). */
  incomingTaunt?: DuelTauntId | null;
  onAccept: (duelId: string) => void;
  onDecline: (duelId: string) => void;
  onTaunt: (duelId: string, tauntId: DuelTauntId) => void;
  className?: string;
}

export function AsyncDuelTurnCard({
  duelId,
  opponentName,
  lessonName,
  opponentScore,
  sentTaunt = null,
  incomingTaunt = null,
  onAccept,
  onDecline,
  onTaunt,
  className,
}: AsyncDuelTurnCardProps) {
  const { t } = useLanguage();
  const hasTarget = opponentScore > 0;
  const incoming = incomingTaunt ? duelTauntById(incomingTaunt) : undefined;

  return (
    <div
      data-testid="duel-turn-card"
      data-state={hasTarget ? 'target-set' : 'first-move'}
      className={cn(
        'rounded-neo border-neo-thick bg-neo-navy p-3 shadow-hard',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Opponent tile */}
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-neo border-neo bg-neo-cyan shadow-hard-sm">
          <span className="font-neo-display text-xl font-black text-neo-black">
            {(opponentName || '?').charAt(0).toUpperCase()}
          </span>
          {incoming && (
            <img
              data-testid="duel-turn-incoming-taunt"
              src={incoming.src}
              alt={t(incoming.labelKey)}
              width={28}
              height={28}
              className="absolute -bottom-2 -end-2 h-7 w-7 object-contain drop-shadow"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-neo-display text-base font-black uppercase italic tracking-tight text-neo-white">
            {hasTarget
              ? t('education.duels.turnBeatThem', undefined, { name: opponentName })
              : t('education.duels.turnFirstMove', undefined, { name: opponentName })}
          </p>
          <p className="truncate font-neo-body text-xs font-bold text-neo-white/60">
            {lessonName}
          </p>
        </div>

        {/* The number that makes it a game */}
        {hasTarget && (
          <div
            data-testid="duel-turn-target"
            className="shrink-0 rounded-neo border-neo bg-neo-yellow px-2.5 py-1 text-center shadow-hard-sm"
          >
            <span className="flex items-center gap-1 font-neo-display text-lg font-black leading-none tabular-nums text-neo-black">
              <Target className="h-4 w-4" aria-hidden="true" />
              {opponentScore}
            </span>
            <span className="font-neo-body text-[9px] font-black uppercase tracking-widest text-neo-black/70">
              {t('education.duels.turnToBeat')}
            </span>
          </div>
        )}
      </div>

      {/* Something to do while you wait */}
      <TauntStickerPicker
        className="mt-3"
        selected={sentTaunt}
        onSelect={(tauntId) => onTaunt(duelId, tauntId)}
      />

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          data-testid="duel-turn-play"
          onClick={() => onAccept(duelId)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-neo border-neo bg-neo-lime px-4 py-2.5 font-neo-display text-sm font-black uppercase italic tracking-tight text-neo-black shadow-hard transition-all duration-100 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed"
        >
          <Swords className="h-4 w-4" aria-hidden="true" />
          {hasTarget ? t('education.duels.turnBeatIt') : t('education.duels.turnPlay')}
        </button>
        <button
          type="button"
          data-testid="duel-turn-decline"
          onClick={() => onDecline(duelId)}
          className="rounded-neo border-[3px] border-neo-cream bg-neo-navy px-3 py-2.5 font-neo-body text-sm font-black text-neo-cream shadow-hard-sm transition-all duration-100 hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed"
        >
          {t('education.duels.turnDecline')}
        </button>
      </div>
    </div>
  );
}
