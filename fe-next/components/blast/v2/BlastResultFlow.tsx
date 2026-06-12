'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BlastLevelCompleteCard } from './BlastLevelCompleteCard';
import { BlastChestOpenModal } from './BlastChestOpenModal';
import { PreResultFanfare } from '@/components/results/PreResultFanfare';
import { pickBlastResultKind } from '@/lib/blast/v2/resultKind';
import type { ChestContents } from '@/lib/blast/v2/chest-roll';

type CardProps = Omit<ComponentProps<typeof BlastLevelCompleteCard>, 'onNext'>;

type Props = CardProps & {
  /** Server-authoritative: is the chest full and openable right now? */
  chestReady: boolean;
  /** Rolled chest contents — null until the open-chest server roll resolves. */
  chestContents: ChestContents | null;
  /** Fires the open-chest server call (awards coins, rolls contents). */
  openChest: () => void;
  openStatus: 'idle' | 'loading' | 'success' | 'error';
  onAdvance: () => void;
};

type Phase = 'fanfare' | 'card' | 'chest';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * BlastResultFlow — owns the whole post-level sequence so the chest reward is
 * actually granted (the old inline code in BlastGame destructured `openChest`
 * but never called it, so a full chest opened to nothing) and so the result
 * "page" can vary by outcome.
 *
 * Sequence:  [prefanfare — notable outcomes only] → complete card → [chest
 * ceremony when full] → advance. Reduced-motion users skip the cinematic.
 *
 * Being fully prop-driven (no engine coupling) makes the "full chest → reward
 * shown" path unit-testable, which the original tangle never was.
 */
export function BlastResultFlow({
  chestReady,
  chestContents,
  openChest,
  openStatus,
  onAdvance,
  ...cardProps
}: Props) {
  const { t } = useLanguage();

  const kind = useMemo(
    () =>
      pickBlastResultKind({
        stars: cardProps.stars,
        completionReason: cardProps.completionReason,
        bonusWordsFound: cardProps.bonusWordsFound,
        chestReady,
      }),
    [cardProps.stars, cardProps.completionReason, cardProps.bonusWordsFound, chestReady],
  );

  const [phase, setPhase] = useState<Phase>(() => (kind && !prefersReducedMotion() ? 'fanfare' : 'card'));
  // Guard the imperative open so a stray double-tap (or effect re-run) can't
  // fire two open-chest calls / double-award coins.
  const openedRef = useRef(false);

  const handleNext = useCallback(() => {
    if (chestReady) {
      setPhase('chest');
      if (!openedRef.current) {
        openedRef.current = true;
        openChest();
      }
    } else {
      onAdvance();
    }
  }, [chestReady, openChest, onAdvance]);

  // Never strand the player: if the open-chest roll errors, move on rather than
  // sitting forever on the opening ceremony.
  useEffect(() => {
    if (phase === 'chest' && openStatus === 'error') onAdvance();
  }, [phase, openStatus, onAdvance]);

  if (phase === 'fanfare' && kind) {
    return <PreResultFanfare kind={kind} t={t} onComplete={() => setPhase('card')} />;
  }

  if (phase === 'chest') {
    if (chestContents) {
      return <BlastChestOpenModal contents={chestContents} isOpen onClose={onAdvance} />;
    }
    return <ChestOpening modeColor={cardProps.modeColor} label={t('blast.chest.opening', 'Opening chest…')} />;
  }

  return <BlastLevelCompleteCard {...cardProps} onNext={handleNext} />;
}

/** Brief "rolling the reward" beat while the server resolves chest contents. */
function ChestOpening({ modeColor = '#BFFF00', label }: { modeColor?: string; label: string }) {
  return (
    <div
      data-testid="chest-opening"
      className="fixed inset-0 grid place-items-center bg-[#0b1530]/95 text-white"
    >
      <div className="flex flex-col items-center gap-4">
        <span
          className="text-6xl animate-[blastChestRock_0.5s_ease-in-out_infinite]"
          style={{ filter: `drop-shadow(0 0 16px ${modeColor})` }}
          aria-hidden
        >
          📦
        </span>
        <span className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: modeColor }}>
          {label}
        </span>
      </div>
      <style>{`
        @keyframes blastChestRock {
          0%, 100% { transform: rotate(-8deg) scale(1); }
          50% { transform: rotate(8deg) scale(1.08); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-testid="chest-opening"] span { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
