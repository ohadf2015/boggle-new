'use client';

import { useState } from 'react';
import { Play, X, Shield, Bomb, Zap, Sparkles } from 'lucide-react';
import { useRewardedFeatureUnlock } from '@/hooks/useRewardedFeatureUnlock';

export type BlastPregameBuff = 'shield' | 'bomb' | 'combo2x';

interface BlastPregameBuffModalProps {
  isOpen: boolean;
  onPick: (buff: BlastPregameBuff) => void;
  onSkip: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const BUFFS: { id: BlastPregameBuff; Icon: typeof Shield; color: string; ring: string }[] = [
  { id: 'shield',  Icon: Shield, color: 'bg-neo-cyan', ring: 'ring-neo-cyan' },
  { id: 'bomb',    Icon: Bomb,   color: 'bg-neo-pink', ring: 'ring-neo-pink' },
  { id: 'combo2x', Icon: Zap,    color: 'bg-neo-lime', ring: 'ring-neo-lime' },
];

export function BlastPregameBuffModal({ isOpen, onPick, onSkip, t }: BlastPregameBuffModalProps) {
  const [selected, setSelected] = useState<BlastPregameBuff | null>(null);

  const { offer, canShowAd } = useRewardedFeatureUnlock({
    placement: 'blast_pregame_buff',
    surface: 'generic',
    onUnlock: () => {
      if (selected) onPick(selected);
    },
    disabled: !isOpen || selected === null,
    context: selected ? { buff: selected } : undefined,
  });

  if (!isOpen) return null;

  const selectedLabel = selected ? t(`blast.pregameBuff.${selected}`) : '';
  const selectedDesc = selected ? t(`blast.pregameBuff.${selected}Desc`) : t('blast.pregameBuff.ctaDefault');

  return (
    <>
      <div
        data-testid="blast-pregame-buff-modal"
        className="fixed inset-0 z-[90] flex items-center justify-center bg-neo-navy/90 p-4 backdrop-blur-sm animate-in fade-in-0 duration-300"
      >
        <div
          className="relative w-full max-w-md rounded-neo border-neo-thick border-black bg-neo-navy-light p-6 shadow-hard-lg animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300"
        >
          {/* Sparkle ribbon — "FREE" badge to amplify reward feel */}
          <div className="absolute -top-3 -right-3 flex items-center gap-1 rounded-full border-2 border-black bg-neo-lime px-3 py-1 font-neo-display text-xs font-black uppercase tracking-wider text-neo-navy shadow-hard">
            <Sparkles className="h-3 w-3" strokeWidth={3} />
            {t('blast.pregameBuff.claim')}
          </div>

          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="font-neo-display text-3xl font-black text-neo-white">
              {t('blast.pregameBuff.title')}
            </h2>
            <p className="font-neo-body text-sm text-neo-white">
              {t('blast.pregameBuff.body')}
            </p>

            <div className="grid w-full grid-cols-3 gap-3 pt-2">
              {BUFFS.map(({ id, Icon, color, ring }) => {
                const isSel = selected === id;
                return (
                  <button
                    key={id}
                    data-testid={`blast-pregame-buff-${id}`}
                    onClick={() => setSelected(id)}
                    aria-pressed={isSel}
                    className={`flex flex-col items-center gap-2 rounded-neo border-neo-thick border-black ${color} p-3 font-neo-display text-xs font-black text-neo-navy shadow-hard transition-all hover:scale-105 ${isSel ? `translate-x-[1px] translate-y-[1px] shadow-hard-pressed ring-4 ${ring} scale-105` : ''}`}
                  >
                    <Icon className="h-7 w-7" strokeWidth={3} />
                    <span>{t(`blast.pregameBuff.${id}`)}</span>
                  </button>
                );
              })}
            </div>

            {/* Description panel — explains what the selected buff actually does. Shown
                even before selection (with a "pick one" hint) so the player understands
                the mechanic before committing to an ad watch. */}
            <div
              data-testid="blast-pregame-buff-desc"
              className={`min-h-[3.5rem] w-full rounded-neo border-2 border-dashed px-4 py-3 font-neo-body text-sm transition-colors ${
                selected
                  ? 'border-neo-cream/40 bg-neo-cream/5 text-neo-white'
                  : 'border-neo-cream/15 text-neo-white'
              }`}
            >
              {selected && <span className="font-black uppercase tracking-wider">{selectedLabel}: </span>}
              {selectedDesc}
            </div>

            <div className="flex w-full flex-col gap-3 pt-1">
              {canShowAd && (
                <button
                  data-testid="blast-pregame-buff-cta"
                  onClick={offer}
                  disabled={selected === null}
                  className="flex items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-lime px-6 py-4 font-neo-display text-lg font-black uppercase tracking-wide text-neo-navy shadow-hard-lg transition-all hover:bg-neo-lime-light active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-pressed disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-neo-lime"
                >
                  <Play className="h-5 w-5 fill-neo-navy" strokeWidth={3} />
                  {selected
                    ? t('blast.pregameBuff.cta', { buff: selectedLabel })
                    : t('blast.pregameBuff.ctaDefault')}
                </button>
              )}
              <button
                data-testid="blast-pregame-buff-skip"
                onClick={onSkip}
                className="flex items-center justify-center gap-2 rounded-neo border-neo border-black/40 bg-transparent px-4 py-2 font-neo-body text-sm text-neo-white hover:text-neo-white hover:border-black"
              >
                <X className="h-4 w-4" />
                {t('blast.pregameBuff.skip')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default BlastPregameBuffModal;
