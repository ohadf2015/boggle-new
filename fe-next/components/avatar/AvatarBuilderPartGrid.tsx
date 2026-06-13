'use client';

import { useState } from 'react';
import { Lock, Coins, X } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import PartPreview from './PartPreview';
import {
  type CustomAvatarConfig,
  isPremiumPart,
  isEpicPart,
  isLegendaryPart,
  getPartPrice,
  isNewPart,
} from '@/shared/types/customAvatar';
import type { AvatarPremium } from './AvatarBuilderModal';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { safeToLocaleString } from '@/utils/bcp47Locale';

// Staggered grid entrance — cascading waterfall (from animate-ai: playful-staggered-list)
const gridContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.03, delayChildren: 0.05 },
  },
};

const gridItemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

// Bounce button spring (from animate-ai: playful-spring-bounce-button)
const BUTTON_SPRING = { type: 'spring' as const, stiffness: 400, damping: 17 };

export interface PartPreviewGridProps<T extends string> {
  label: string;
  partType: 'base' | 'eyes' | 'eyebrows' | 'mouth' | 'hair' | 'accessory' | 'facialHair' | 'nose';
  /** The avatar config category key used for premium checks */
  premiumCategory?: string;
  options: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
  config: CustomAvatarConfig;
  noneLabel?: string;
  premium?: AvatarPremium | undefined;
  t?: (key: string) => string;
  onCoinSpend?: (amount: number) => void;
}

interface PurchaseConfirmState {
  option: string;
  price: number;
  isEpic: boolean;
  isLegendary: boolean;
}

export default function PartPreviewGrid<T extends string>({
  label,
  partType,
  premiumCategory,
  options,
  selected,
  onSelect,
  config,
  noneLabel,
  premium,
  t: _t,
  onCoinSpend,
}: PartPreviewGridProps<T>) {
  const cat = premiumCategory ?? partType;
  const { language } = useLanguage();
  const [confirmPurchase, setConfirmPurchase] = useState<PurchaseConfirmState | null>(null);

  const handleClick = (option: T) => {
    const isPrem = isPremiumPart(cat, option);
    if (isPrem && premium && !premium.isPartUnlocked(cat, option)) {
      const price = getPartPrice(cat, option);
      if (premium.coins < price) {
        toast(`${price} gold needed`, { icon: '🔒', duration: 2000 });
        return;
      }
      // Show confirmation modal instead of buying directly
      setConfirmPurchase({
        option,
        price,
        isEpic: isEpicPart(cat, option),
        isLegendary: isLegendaryPart(cat, option),
      });
      return;
    }
    onSelect(option);
  };

  const handleConfirmPurchase = async () => {
    if (!confirmPurchase || !premium) return;
    const success = await premium.purchaseWithGold(cat, confirmPurchase.option);
    if (success) {
      onCoinSpend?.(confirmPurchase.price);
      onSelect(confirmPurchase.option as T);
    }
    setConfirmPurchase(null);
  };

  // When no premium context exists (e.g. onboarding), hide premium parts entirely
  // so guests can only pick free parts. When premium exists, show all and gate with locks.
  const visibleOptions = premium
    ? options
    : options.filter(o => o === 'none' || !isPremiumPart(cat, o));

  // Sort: 'none' first, then NEW drops (discovery), then other premium, then free.
  const sortedOptions = [...visibleOptions].sort((a, b) => {
    if (a === 'none') return -1;
    if (b === 'none') return 1;
    const aNew = isNewPart(cat, a);
    const bNew = isNewPart(cat, b);
    if (aNew !== bNew) return aNew ? -1 : 1;
    const aPrem = isPremiumPart(cat, a);
    const bPrem = isPremiumPart(cat, b);
    if (aPrem !== bPrem) return aPrem ? -1 : 1;
    return 0;
  });

  return (
    <div>
      <p className="text-neo-white text-xs font-bold uppercase mb-2">{label}</p>
      <AdaptiveMotion.div
        variants={gridContainerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-3 @[24rem]:grid-cols-4 @[36rem]:grid-cols-5 gap-2"
      >
        {sortedOptions.map(option => {
          const isPremium = isPremiumPart(cat, option);
          const isEpic = isEpicPart(cat, option);
          const isLegendary = isLegendaryPart(cat, option);
          const isLocked = isPremium && premium && !premium.isPartUnlocked(cat, option);
          const price = isPremium ? getPartPrice(cat, option) : 0;
          const isNew = isNewPart(cat, option);

          return (
            <AdaptiveMotion.button
              key={option}
              variants={gridItemVariants}
              onClick={() => handleClick(option)}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.88 }}
              transition={BUTTON_SPRING}
              className={`relative flex flex-col items-center p-1.5 rounded-neo border-2 transition-colors ${
                selected === option
                  ? 'bg-neo-lime/15 border-neo-lime shadow-hard-sm ring-1 ring-neo-lime/30'
                  : isLocked && isLegendary
                    ? 'bg-linear-to-b from-amber-900/40 to-neo-navy-light/50 border-amber-400/50 hover:border-amber-300/70 ring-1 ring-amber-500/20'
                    : isLocked && isEpic
                      ? 'bg-linear-to-b from-purple-900/30 to-neo-navy-light/50 border-purple-500/40 hover:border-purple-400/60'
                      : isLocked
                        ? 'bg-neo-navy-light/50 border-neo-white/10 hover:border-neo-yellow/40'
                        : 'bg-neo-navy-light border-neo-white/15 hover:border-neo-white/40 hover:bg-neo-navy-light/80'
              }`}
            >
              {/* NEW ribbon — top-start corner (opposite the tier badge) */}
              {isNew && selected !== option && (
                <div className="absolute top-0.5 inset-s-0.5 z-10">
                  <span className="text-[7px] font-black text-neo-navy bg-neo-lime px-1 rounded-sm shadow-xs tracking-wide">NEW</span>
                </div>
              )}

              {/* Tier badge — top corner */}
              {isLocked && (isLegendary || isEpic) && (
                <div className="absolute top-0.5 inset-e-0.5 z-10">
                  {isLegendary ? (
                    <span className="text-[7px] font-black text-amber-300 bg-linear-to-r from-amber-900/80 to-amber-800/80 px-1 rounded shadow-xs tracking-wide">LEGENDARY</span>
                  ) : (
                    <span className="text-[8px] font-black text-purple-400 bg-purple-900/60 px-1 rounded">EPIC</span>
                  )}
                </div>
              )}

              {/* Part preview */}
              <div className={`w-12 h-12 flex items-center justify-center ${isLocked ? 'opacity-40 grayscale-30' : ''}`}>
                {option === 'none' ? (
                  <span className="text-neo-white text-xs font-bold">{noneLabel ?? '—'}</span>
                ) : (
                  <PartPreview partType={partType} partName={option} config={config} size={48} />
                )}
              </div>

              {/* Price badge — below preview, in flow (not overlapping) */}
              {isLocked && (
                <div className={`flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded-full ${
                  isLegendary ? 'bg-amber-900/70' : isEpic ? 'bg-purple-900/60' : 'bg-neo-navy/80'
                }`}>
                  <Lock className={`w-2.5 h-2.5 ${isLegendary ? 'text-amber-300' : isEpic ? 'text-purple-300' : 'text-neo-yellow'}`} />
                  <Coins className={`w-2.5 h-2.5 ${isLegendary ? 'text-amber-300' : isEpic ? 'text-purple-300' : 'text-neo-yellow'}`} />
                  <span className={`text-[10px] font-black tabular-nums ${
                    isLegendary ? 'text-amber-300' : isEpic ? 'text-purple-300' : 'text-neo-yellow'
                  }`}>
                    {price}
                  </span>
                </div>
              )}

              {/* Part name — always visible, never overlapped */}
              {!isLocked && (
                <span className={`text-[10px] font-bold capitalize truncate w-full text-center mt-0.5 ${
                  selected === option ? 'text-neo-lime' : 'text-neo-white'
                }`}>
                  {option === 'none' ? (noneLabel ?? option) : option}
                </span>
              )}
            </AdaptiveMotion.button>
          );
        })}
      </AdaptiveMotion.div>

      {/* Purchase confirmation modal */}
      <AdaptiveAnimatePresence>
        {confirmPurchase && (
          <AdaptiveMotion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            onClick={() => setConfirmPurchase(null)}
          >
            <AdaptiveMotion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              className={`relative mx-4 p-5 rounded-neo-lg border-3 border-black shadow-hard-lg max-w-xs w-full ${
                confirmPurchase.isLegendary
                  ? 'bg-linear-to-b from-amber-950 to-neo-navy'
                  : confirmPurchase.isEpic
                    ? 'bg-linear-to-b from-purple-950 to-neo-navy'
                    : 'bg-neo-navy'
              }`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setConfirmPurchase(null)}
                className="absolute top-2 inset-e-2 text-neo-white hover:text-neo-white p-1"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              {/* Large part preview */}
              <div className="flex justify-center mb-4">
                <div className={`w-32 h-32 rounded-neo-lg border-3 overflow-hidden ${
                  confirmPurchase.isLegendary ? 'border-amber-500/50' : confirmPurchase.isEpic ? 'border-purple-500/50' : 'border-neo-yellow/30'
                }`}>
                  <PartPreview
                    partType={partType}
                    partName={confirmPurchase.option}
                    config={config}
                    size={128}
                  />
                </div>
              </div>

              {/* Part name */}
              <p className={`text-center text-lg font-neo-display font-bold capitalize mb-1 ${
                confirmPurchase.isLegendary ? 'text-amber-300' : confirmPurchase.isEpic ? 'text-purple-300' : 'text-neo-white'
              }`}>
                {confirmPurchase.option}
              </p>

              {/* Tier label */}
              {(confirmPurchase.isLegendary || confirmPurchase.isEpic) && (
                <p className={`text-center text-xs font-black uppercase tracking-wider mb-3 ${
                  confirmPurchase.isLegendary ? 'text-amber-400' : 'text-purple-400'
                }`}>
                  {confirmPurchase.isLegendary ? 'LEGENDARY' : 'EPIC'}
                </p>
              )}

              {/* Price + balance */}
              <div className="flex items-center justify-center gap-3 mb-4 mt-3">
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-neo border-2 ${
                  confirmPurchase.isLegendary ? 'border-amber-500/40 bg-amber-900/30' : confirmPurchase.isEpic ? 'border-purple-500/40 bg-purple-900/30' : 'border-neo-yellow/40 bg-neo-navy-light'
                }`}>
                  <Coins className={`w-4 h-4 ${
                    confirmPurchase.isLegendary ? 'text-amber-300' : confirmPurchase.isEpic ? 'text-purple-300' : 'text-neo-yellow'
                  }`} />
                  <span className={`text-base font-black tabular-nums ${
                    confirmPurchase.isLegendary ? 'text-amber-300' : confirmPurchase.isEpic ? 'text-purple-300' : 'text-neo-yellow'
                  }`}>
                    {confirmPurchase.price}
                  </span>
                </div>
              </div>

              {/* Current balance */}
              {premium && (
                <p className="text-center text-xs text-neo-white mb-4">
                  Balance: <span className="text-neo-yellow font-bold tabular-nums">{safeToLocaleString(premium.coins, language)}</span> → <span className="text-neo-white font-bold tabular-nums">{safeToLocaleString(premium.coins - confirmPurchase.price, language)}</span>
                </p>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmPurchase(null)}
                  className="flex-1 px-4 py-2.5 text-neo-white font-bold rounded-neo border-2 border-neo-white/15 hover:border-neo-white/30 transition-colors"
                >
                  {_t?.('avatarBuilder.cancel') || 'Cancel'}
                </button>
                <AdaptiveMotion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  transition={BUTTON_SPRING}
                  onClick={handleConfirmPurchase}
                  disabled={premium?.isPurchasing}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 font-bold rounded-neo border-2 border-black shadow-hard-sm transition-colors disabled:opacity-50 ${
                    confirmPurchase.isLegendary
                      ? 'bg-linear-to-r from-amber-500 to-amber-600 text-black'
                      : confirmPurchase.isEpic
                        ? 'bg-linear-to-r from-purple-500 to-purple-600 text-white'
                        : 'bg-neo-lime text-neo-black'
                  }`}
                >
                  <Coins className="w-4 h-4" />
                  {_t?.('avatar.premium.unlock') || 'Unlock'}
                </AdaptiveMotion.button>
              </div>
            </AdaptiveMotion.div>
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>
    </div>
  );
}
