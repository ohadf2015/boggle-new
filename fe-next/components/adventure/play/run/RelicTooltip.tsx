'use client';

/**
 * Relic detail bubble: art, name, rarity, one-line effect, and the LIVE numbers —
 * what it earned this level and what it is worth alone vs stacked with the run.
 */
import { motion } from 'framer-motion';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { RELICS, type RelicId } from '@/lib/adventure/play/relics';
import { relicStack, type LevelWords } from '@/lib/adventure/play/relicStack';
import { RARITY_FRAME, relicArt } from './art';
import { cn } from '@/lib/utils';

export interface StackCtx { levels: readonly LevelWords[]; owned: readonly RelicId[] }

interface Props {
  id: RelicId;
  onClose: () => void;
  /** Points this relic added this level (leave-one-out). */
  earned?: number;
  stackCtx?: StackCtx | null;
}

export default function RelicTooltip({ id, onClose, earned, stackCtx }: Props) {
  const { t } = useLanguageSafe();
  const stack = stackCtx ? relicStack(id, stackCtx) : null;
  const rarity = RELICS[id].rarity;
  const frame = RARITY_FRAME[rarity];
  return (
    <motion.div
      role="tooltip"
      initial={{ opacity: 0, y: -6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.14 }}
      onClick={onClose}
      className="absolute start-0 top-full z-40 mt-1.5 flex w-[min(15.5rem,calc(100vw-9rem))] min-w-full items-center gap-2.5 rounded-xl border-[3px] border-black bg-[#0f1b3d] p-2 text-neo-cream shadow-[4px_4px_0_#000]"
    >
      <span className={cn('grid shrink-0 place-items-center rounded-lg border-[3px] border-black p-0.5', frame.bg)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- small static art */}
        <img src={relicArt(id)} alt="" className="h-11 w-11 object-contain" />
      </span>
      <span className="min-w-0 flex-1">
        {/* Rarity sits on its own line: inline beside a two-word name it overflowed the bubble. */}
        <span className={cn('block text-[10px] font-black uppercase leading-none tracking-wider', frame.text)}>{t(`adventurePlay.loot.rarity.${rarity}`)}</span>
        <span className="block font-neo-display text-base font-bold leading-tight">{t(`adventurePlay.relic.${id}`)}</span>
        <span className="block text-xs font-semibold leading-snug opacity-90">{t(`adventurePlay.relicDesc.${id}`)}</span>
        {typeof earned === 'number' && (
          <span data-testid="relic-earned" className="mt-1 flex items-center justify-between gap-2 rounded-md border-2 border-black bg-neo-lime px-1.5 text-[11px] font-black text-black">
            <span className="truncate">{t('adventurePlay.loot.thisLevel')}</span>
            <span dir="ltr" className="font-neo-display text-sm tabular-nums">+{earned}</span>
          </span>
        )}
        {stack && (
          <span data-testid="relic-stack" className="mt-1 block rounded-md border-2 border-black bg-black/60 px-1.5 py-0.5 text-[10px] font-bold leading-tight">
            <span className="flex items-center justify-between gap-2">
              <span className="truncate opacity-80">{t('adventurePlay.loot.stackAlone')}</span>
              <span dir="ltr" className="font-neo-display text-xs tabular-nums">+{stack.alone}</span>
            </span>
            <span className={cn('flex items-center justify-between gap-2', stack.synergy && 'text-neo-yellow')}>
              <span className="truncate">{t('adventurePlay.loot.stackCombined')}</span>
              <span dir="ltr" className="font-neo-display text-sm tabular-nums">+{stack.combined}</span>
            </span>
            <span className="block text-[9px] opacity-70">{t('adventurePlay.loot.stackPerLevel')}</span>
          </span>
        )}
      </span>
    </motion.div>
  );
}
