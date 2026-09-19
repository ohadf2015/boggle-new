'use client';

/**
 * The deed stamp — the top of the praise ladder. A blow that takes a big bite of the foe's
 * REMAINING HP slams a full-width banner across the screen (flash, overshoot stamp, a slow
 * drift while it hangs — the slow-mo beat), with the word, the damage and the drop it earned.
 * Portalled, pointer-events none: play never stops under it.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { Deed } from './deedTier';

export interface DeedEvent {
  id: number;
  deed: Deed;
  word: string;
  pts: number;
  /** Combat foe → "-N"; score foe → still damage, drawn the same. */
  drop: boolean;
  /** When the letters land on the target (ms after the submit). */
  delayMs: number;
}

const HOLD_MS = 1250;
/** Across the board, below the hanging cast word and the foe's damage number. */
const BAND_TOP = '58%';

const LOOK: Record<Deed, { band: string; ink: string; flash: string; size: string; tilt: number }> = {
  crushed: { band: '#ff4fa3', ink: '#0f1b3d', flash: 'rgba(255,79,163,0.45)', size: 'clamp(2.6rem, 14vw, 5.5rem)', tilt: -5 },
  obliterated: { band: '#facc15', ink: '#0f1b3d', flash: 'rgba(255,255,255,0.7)', size: 'clamp(2.1rem, 11.5vw, 5rem)', tilt: -7 },
};

export default function DeedStamp({ event }: { event: DeedEvent | null }) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const sfx = useSoundEffects();
  const [shown, setShown] = useState<DeedEvent | null>(null);

  useEffect(() => {
    if (!event) return;
    const a = setTimeout(() => {
      setShown(event);
      if (event.deed === 'obliterated') sfx.playMegaCascadeSound?.(); else sfx.playComboMilestoneSound?.(10);
      if (event.drop) sfx.playPowerUpSound?.();
    }, reduce ? 0 : event.delayMs);
    const b = setTimeout(() => setShown((s) => (s?.id === event.id ? null : s)), (reduce ? 0 : event.delayMs) + HOLD_MS);
    return () => { clearTimeout(a); clearTimeout(b); };
    // Only a new deed re-arms the stamp (sfx identity must not replay it).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, reduce]);

  if (!shown || typeof document === 'undefined') return null;
  const look = LOOK[shown.deed];
  const big = shown.deed === 'obliterated';

  return createPortal(
    <div key={shown.id} className="pointer-events-none fixed inset-0 z-[71] overflow-hidden" aria-live="polite" data-testid="adv-deed" data-deed={shown.deed}>
      {!reduce && (
        <motion.div className="absolute inset-0" style={{ background: look.flash }}
          initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: big ? 0.38 : 0.26, times: [0, 0.15, 1] }} />
      )}
      {!reduce && big && (
        // Radial speed lines behind the band.
        <div className="absolute left-1/2 h-[160vmax] w-[160vmax] -translate-x-1/2 -translate-y-1/2" style={{ top: BAND_TOP }}>
          <motion.div className="h-full w-full"
            style={{ background: 'repeating-conic-gradient(rgba(250,204,21,0.28) 0deg 6deg, transparent 6deg 18deg)' }}
            initial={{ opacity: 0, scale: 0.4, rotate: 0 }} animate={{ opacity: [0, 1, 0], scale: 1, rotate: 20 }}
            transition={{ duration: HOLD_MS / 1000, ease: 'easeOut' }} />
        </div>
      )}
      <div className="absolute inset-x-[-8vw] -translate-y-1/2" style={{ top: BAND_TOP }}>
      <motion.div className="border-y-[4px] border-black shadow-[0_8px_0_#000]"
        style={{ background: look.band, rotate: look.tilt }}
        initial={reduce ? false : { scaleY: 0 }} animate={reduce ? undefined : { scaleY: [0, 1.15, 1] }}
        transition={{ duration: 0.22, ease: 'easeOut' }}>
        <div className="flex flex-col items-center py-2">
          <motion.div className="font-neo-display font-black uppercase leading-none tracking-tight whitespace-nowrap"
            style={{ fontSize: look.size, color: look.ink, WebkitTextStroke: '2px #000', textShadow: '4px 4px 0 #fff' }}
            initial={reduce ? false : { scale: 2.6, opacity: 0 }}
            animate={reduce ? undefined : { scale: [2.6, 0.9, 1, 1.06], opacity: [0, 1, 1, 1] }}
            transition={{ duration: HOLD_MS / 1000, times: [0, 0.14, 0.22, 1], ease: 'easeOut' }}>
            {t(`adventurePlay.deed.${shown.deed}`)}
          </motion.div>
          <div className="mt-1 flex items-center gap-2">
            <span dir="ltr" className="rounded-md border-[3px] border-black bg-[#0f1b3d] px-2 font-neo-display text-lg font-black text-neo-cream tabular-nums shadow-[2px_2px_0_#000]">
              {shown.word.toUpperCase()} −{shown.pts}
            </span>
            {shown.drop && (
              <motion.span className="inline-flex items-center gap-1 rounded-md border-[3px] border-black bg-neo-lime px-2 font-neo-display text-lg font-black text-black shadow-[2px_2px_0_#000]"
                initial={reduce ? false : { scale: 0, rotate: -20 }} animate={reduce ? undefined : { scale: [0, 1.3, 1], rotate: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}>
                <Lightbulb className="h-4 w-4" aria-hidden /> {t('adventurePlay.deed.bonusHint')}
              </motion.span>
            )}
          </div>
        </div>
      </motion.div>
      </div>
    </div>,
    document.body,
  );
}
