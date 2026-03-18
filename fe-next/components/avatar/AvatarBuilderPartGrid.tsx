'use client';

import { Lock, Coins } from 'lucide-react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import PartPreview from './PartPreview';
import {
  type CustomAvatarConfig,
  isPremiumPart,
  isEpicPart,
  isLegendaryPart,
  getPartPrice,
} from '@/shared/types/customAvatar';
import type { AvatarPremium } from './AvatarBuilderModal';
import toast from 'react-hot-toast';

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
  partType: 'base' | 'eyes' | 'eyebrows' | 'mouth' | 'hair' | 'accessory';
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

  const handleClick = async (option: T) => {
    const isPrem = isPremiumPart(cat, option);
    if (isPrem && premium && !premium.isPartUnlocked(cat, option)) {
      const price = getPartPrice(cat, option);
      if (premium.coins >= price) {
        const success = await premium.purchaseWithGold(cat, option);
        if (success) {
          onCoinSpend?.(price);
          onSelect(option);
        }
      } else {
        toast(`${price} gold needed`, { icon: '🔒', duration: 2000 });
      }
      return;
    }
    onSelect(option);
  };

  // Sort: premium/epic/legendary first, then free parts
  const sortedOptions = [...options].sort((a, b) => {
    const aPrem = isPremiumPart(cat, a);
    const bPrem = isPremiumPart(cat, b);
    if (a === 'none') return -1;
    if (b === 'none') return 1;
    if (aPrem && !bPrem) return -1;
    if (!aPrem && bPrem) return 1;
    return 0;
  });

  return (
    <div>
      <p className="text-neo-white/60 text-xs font-bold uppercase mb-2">{label}</p>
      <AdaptiveMotion.div
        variants={gridContainerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-3 sm:grid-cols-4 gap-2"
      >
        {sortedOptions.map(option => {
          const isPremium = isPremiumPart(cat, option);
          const isEpic = isEpicPart(cat, option);
          const isLegendary = isLegendaryPart(cat, option);
          const isLocked = isPremium && premium && !premium.isPartUnlocked(cat, option);

          return (
            <AdaptiveMotion.button
              key={option}
              variants={gridItemVariants}
              onClick={() => handleClick(option)}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.88 }}
              transition={BUTTON_SPRING}
              className={`relative flex flex-col items-center gap-1 p-1.5 rounded-neo border-2 transition-colors ${
                selected === option
                  ? 'bg-neo-lime/15 border-neo-lime shadow-hard-sm ring-1 ring-neo-lime/30'
                  : isLocked && isLegendary
                    ? 'bg-gradient-to-b from-amber-900/40 to-neo-navy-light/50 border-amber-400/50 hover:border-amber-300/70 ring-1 ring-amber-500/20'
                    : isLocked && isEpic
                      ? 'bg-gradient-to-b from-purple-900/30 to-neo-navy-light/50 border-purple-500/40 hover:border-purple-400/60'
                      : isLocked
                        ? 'bg-neo-navy-light/50 border-neo-white/10 hover:border-neo-yellow/40'
                        : 'bg-neo-navy-light border-neo-white/15 hover:border-neo-white/40 hover:bg-neo-navy-light/80'
              }`}
            >
              <div className={`w-12 h-12 flex items-center justify-center ${isLocked ? 'opacity-40 grayscale-[30%]' : ''}`}>
                {option === 'none' ? (
                  <span className="text-neo-white/40 text-xs font-bold">{noneLabel ?? '—'}</span>
                ) : (
                  <PartPreview partType={partType} partName={option} config={config} size={48} />
                )}
              </div>
              {isLocked && (
                <>
                  {/* Tier badge */}
                  <div className="absolute top-0.5 end-0.5">
                    {isLegendary ? (
                      <span className="text-[7px] font-black text-amber-300 bg-gradient-to-r from-amber-900/80 to-amber-800/80 px-1 rounded shadow-sm tracking-wide">LEGENDARY</span>
                    ) : isEpic ? (
                      <span className="text-[8px] font-black text-purple-400 bg-purple-900/60 px-1 rounded">EPIC</span>
                    ) : null}
                  </div>
                  {/* Lock overlay with price — covers bottom half for clear visibility */}
                  <div className={`absolute bottom-0 inset-x-0 flex items-center justify-center gap-1 py-1 rounded-b-neo ${
                    isLegendary ? 'bg-gradient-to-t from-amber-900/90 to-amber-900/50' : isEpic ? 'bg-gradient-to-t from-purple-900/90 to-purple-900/50' : 'bg-gradient-to-t from-neo-navy/90 to-neo-navy/50'
                  }`}>
                    <Lock className={`w-3 h-3 ${isLegendary ? 'text-amber-300' : isEpic ? 'text-purple-300' : 'text-neo-yellow'}`} />
                    <span className={`text-[11px] font-black flex items-center gap-0.5 ${
                      isLegendary ? 'text-amber-300' : isEpic ? 'text-purple-300' : 'text-neo-yellow'
                    }`}>
                      <Coins className="w-3 h-3" />
                      {getPartPrice(cat, option)}
                    </span>
                  </div>
                </>
              )}
              <span className={`text-[10px] font-bold capitalize truncate w-full text-center ${
                selected === option ? 'text-neo-lime'
                  : isLocked && isLegendary ? 'text-amber-400/80'
                    : isLocked && isEpic ? 'text-purple-400/70'
                      : isLocked ? 'text-neo-yellow/60' : 'text-neo-white/50'
              }`}>
                {option === 'none' ? (noneLabel ?? option) : option}
              </span>
            </AdaptiveMotion.button>
          );
        })}
      </AdaptiveMotion.div>
    </div>
  );
}
