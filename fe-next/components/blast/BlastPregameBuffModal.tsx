'use client';

import { useState } from 'react';
import { Play, X, Shield, Bomb, Zap } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useRewardedFeatureUnlock } from '@/hooks/useRewardedFeatureUnlock';

export type BlastPregameBuff = 'shield' | 'bomb' | 'combo2x';

interface BlastPregameBuffModalProps {
  isOpen: boolean;
  onPick: (buff: BlastPregameBuff) => void;
  onSkip: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const BUFFS: { id: BlastPregameBuff; Icon: typeof Shield; color: string }[] = [
  { id: 'shield', Icon: Shield, color: 'bg-neo-cyan' },
  { id: 'bomb', Icon: Bomb, color: 'bg-neo-pink' },
  { id: 'combo2x', Icon: Zap, color: 'bg-neo-lime' },
];

export function BlastPregameBuffModal({ isOpen, onPick, onSkip, t }: BlastPregameBuffModalProps) {
  const [selected, setSelected] = useState<BlastPregameBuff | null>(null);

  const { offer, canShowAd } = useRewardedFeatureUnlock({
    placement: 'blast_pregame_buff',
    onUnlock: () => {
      if (selected) onPick(selected);
    },
    disabled: !isOpen || selected === null,
    context: selected ? { buff: selected } : undefined,
  });

  if (!isOpen) return null;

  return (
    <AdaptiveAnimatePresence>
      <AdaptiveMotion.div
        data-testid="blast-pregame-buff-modal"
        className="fixed inset-0 z-[90] flex items-center justify-center bg-neo-navy/80 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <AdaptiveMotion.div
          className="relative w-full max-w-md rounded-neo border-neo-thick border-black bg-neo-navy-light p-6 shadow-hard-lg"
          initial={{ scale: 0.85, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.85, y: 20 }}
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="font-neo-display text-2xl font-black text-neo-cream">
              {t('blast.pregameBuff.title')}
            </h2>
            <p className="font-neo-body text-sm text-neo-cream/80">
              {t('blast.pregameBuff.body')}
            </p>

            <div className="grid w-full grid-cols-3 gap-3 pt-2">
              {BUFFS.map(({ id, Icon, color }) => {
                const isSel = selected === id;
                return (
                  <button
                    key={id}
                    data-testid={`blast-pregame-buff-${id}`}
                    onClick={() => setSelected(id)}
                    className={`flex flex-col items-center gap-2 rounded-neo border-neo-thick border-black ${color} p-3 font-neo-display text-xs font-black text-neo-navy shadow-hard transition-transform ${isSel ? 'translate-x-[1px] translate-y-[1px] shadow-hard-pressed ring-4 ring-neo-cream' : ''}`}
                  >
                    <Icon className="h-6 w-6" strokeWidth={3} />
                    <span>{t(`blast.pregameBuff.${id}`)}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex w-full flex-col gap-3 pt-2">
              {canShowAd && (
                <button
                  data-testid="blast-pregame-buff-cta"
                  onClick={offer}
                  disabled={selected === null}
                  className="flex items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-lime px-6 py-3 font-neo-display text-lg font-black text-neo-navy shadow-hard transition-transform active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-pressed disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="h-5 w-5" strokeWidth={3} />
                  {t('blast.pregameBuff.cta')}
                </button>
              )}
              <button
                data-testid="blast-pregame-buff-skip"
                onClick={onSkip}
                className="flex items-center justify-center gap-2 rounded-neo border-neo border-black bg-neo-navy px-4 py-2 font-neo-body text-sm text-neo-cream/70 hover:text-neo-cream"
              >
                <X className="h-4 w-4" />
                {t('blast.pregameBuff.skip')}
              </button>
            </div>
          </div>
        </AdaptiveMotion.div>
      </AdaptiveMotion.div>
    </AdaptiveAnimatePresence>
  );
}

export default BlastPregameBuffModal;
