'use client';

import { useState } from 'react';
import { Lock, Coins, X } from 'lucide-react';
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
import { getSetsForPart, getSetProgress } from '@/lib/avatar/avatarSets';
import AvatarTierBadge, { getPartVisualTier } from './AvatarTierBadge';
import '@/styles/avatar-tier-animations.css';

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

type PartFilter = 'all' | 'vip';

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
  t: tProp,
  onCoinSpend,
}: PartPreviewGridProps<T>) {
  const cat = premiumCategory ?? partType;
  const { language, t: tCtx } = useLanguage();
  const t = tProp ?? tCtx;
  const [confirmPurchase, setConfirmPurchase] = useState<PurchaseConfirmState | null>(null);
  const [tryOnOption, setTryOnOption] = useState<string | null>(null);
  const [partFilter, setPartFilter] = useState<PartFilter>('all');

  const handleClick = (option: T) => {
    const isPrem = isPremiumPart(cat, option);
    if (isPrem && premium && !premium.isPartUnlocked(cat, option)) {
      const price = getPartPrice(cat, option);
      if (premium.coins < price) {
        toast(t('avatarBuilder.goldNeeded').replace('{price}', String(price)), {
          icon: '🔒',
          duration: 2000,
        });
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
    setTryOnOption(null);
  };

  const handleTryOn = () => {
    if (!confirmPurchase) return;
    setTryOnOption(`${cat}:${confirmPurchase.option}`);
  };

  const handleCancelTryOn = () => {
    setTryOnOption(null);
  };

  // When no premium context exists (e.g. onboarding), hide premium parts entirely
  // so guests can only pick free parts. When premium exists, show all and gate with locks.
  const baseVisible = premium
    ? options
    : options.filter(o => o === 'none' || !isPremiumPart(cat, o));

  // VIP filter: only premium parts (keep 'none' so players can clear selection).
  const visibleOptions = premium && partFilter === 'vip'
    ? baseVisible.filter(o => o === 'none' || isPremiumPart(cat, o))
    : baseVisible;

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

  // Set-completion nudge for the part being bought: how close this purchase
  // brings the player to finishing a themed set (drives completionist spend).
  const confirmSet = (() => {
    if (!confirmPurchase) return null;
    const set = getSetsForPart(cat, confirmPurchase.option)[0];
    if (!set) return null;
    const ownedKeys = set.parts.filter(k => {
      const [c, i] = k.split(':');
      return premium?.isPartUnlocked(c, i);
    });
    const prog = getSetProgress(set, [...ownedKeys, `${cat}:${confirmPurchase.option}`]);
    return { set, prog };
  })();

  const showFilter = Boolean(premium);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-neo-white text-xs font-bold uppercase">{label}</p>
        {showFilter && (
          <div
            className="flex gap-1"
            role="tablist"
            aria-label={t('avatar.premium.vipBadge')}
          >
            <button
              type="button"
              role="tab"
              aria-selected={partFilter === 'all'}
              onClick={() => setPartFilter('all')}
              className={`px-2 py-0.5 rounded-neo text-[10px] font-black uppercase tracking-wide border transition-colors ${
                partFilter === 'all'
                  ? 'bg-neo-lime/20 border-neo-lime text-neo-lime'
                  : 'bg-neo-navy-light border-neo-white/15 text-neo-white/70 hover:border-neo-white/40'
              }`}
            >
              {t('avatar.premium.filterAll')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={partFilter === 'vip'}
              onClick={() => setPartFilter('vip')}
              className={`px-2 py-0.5 rounded-neo text-[10px] font-black uppercase tracking-wide border transition-colors ${
                partFilter === 'vip'
                  ? 'bg-neo-yellow/20 border-neo-yellow text-neo-yellow'
                  : 'bg-neo-navy-light border-neo-white/15 text-neo-white/70 hover:border-neo-white/40'
              }`}
            >
              {t('avatar.premium.filterVip')}
            </button>
          </div>
        )}
      </div>
      <div
        className="grid grid-cols-3 @[24rem]:grid-cols-4 @[36rem]:grid-cols-5 gap-2"
      >
        {sortedOptions.map(option => {
          const isPremium = isPremiumPart(cat, option);
          const isEpic = isEpicPart(cat, option);
          const isLegendary = isLegendaryPart(cat, option);
          const isLocked = isPremium && premium && !premium.isPartUnlocked(cat, option);
          const price = isPremium ? getPartPrice(cat, option) : 0;
          const isNew = isNewPart(cat, option);
          const visualTier = getPartVisualTier(cat, option);
          const displayName = option === 'none' ? (noneLabel ?? option) : option;
          const hoverTitle = isPremium
            ? `${displayName} · ${t(`avatarBuilder.tiers.${visualTier}`)}`
            : displayName;

          return (
            <button
              key={option}
              type="button"
              onClick={() => handleClick(option)}
              title={hoverTitle}
              aria-label={hoverTitle}
              data-tier={isPremium ? visualTier : 'common'}
              style={{ animationDelay: `${sortedOptions.indexOf(option) * 0.03}s` }}
              className={`relative flex flex-col items-center p-1.5 rounded-neo border-2 transition-colors animate-in fade-in-0 zoom-in-95 duration-300 fill-mode-both hover:scale-[1.06] active:scale-[0.88] transition-transform overflow-hidden ${
                isPremium ? 'avatar-part-cell-premium' : ''
              } ${
                isLegendary ? 'avatar-part-cell-legendary' : isEpic ? 'avatar-part-cell-epic' : isPremium ? 'avatar-part-cell-rare' : ''
              } ${
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
              {/* Subtle shimmer band on premium cells */}
              {isPremium && (
                <span aria-hidden className="avatar-part-shimmer" />
              )}

              {/* NEW ribbon — top-start corner (opposite the tier badge) */}
              {isNew && selected !== option && (
                <div className="absolute top-0.5 inset-s-0.5 z-10">
                  <span className="text-[7px] font-black text-neo-navy bg-neo-lime px-1 rounded-sm shadow-xs tracking-wide">
                    {t('avatarBuilder.new')}
                  </span>
                </div>
              )}

              {/* Tier badge — top corner */}
              <div className="absolute top-0.5 inset-e-0.5 z-10">
                <AvatarTierBadge category={cat} partId={option} size="sm" />
              </div>

              {/* Part preview — locked parts shown at FULL color: show the goods so
                  players want to buy. The lock + price badge below conveys gating. */}
              <div className="w-12 h-12 flex items-center justify-center relative z-[1]">
                {option === 'none' ? (
                  <span className="text-neo-white text-xs font-bold">{noneLabel ?? '—'}</span>
                ) : (
                  <PartPreview partType={partType} partName={option} config={config} size={48} />
                )}
              </div>

              {/* Price badge — below preview, in flow (not overlapping) */}
              {isLocked && (
                <div className={`relative z-[1] flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded-full ${
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
                <span className={`relative z-[1] text-[10px] font-bold capitalize truncate w-full text-center mt-0.5 ${
                  selected === option ? 'text-neo-lime' : 'text-neo-white'
                }`}>
                  {displayName}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Purchase confirmation modal */}
      <>
        {confirmPurchase && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-in fade-in-0 duration-300"
            onClick={() => setConfirmPurchase(null)}
          >
            <div
              className={`relative mx-4 p-5 rounded-neo-lg border-3 border-black shadow-hard-lg max-w-xs w-full animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300 ${
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
                type="button"
                onClick={() => setConfirmPurchase(null)}
                className="absolute top-2 inset-e-2 text-neo-white hover:text-neo-white p-1"
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>

              {/* Large part preview */}
              <div className="flex justify-center mb-4">
                <div className={`relative w-32 h-32 rounded-neo-lg border-3 overflow-hidden ${
                  confirmPurchase.isLegendary ? 'border-amber-500/50' : confirmPurchase.isEpic ? 'border-purple-500/50' : 'border-neo-yellow/30'
                }`}>
                  <PartPreview
                    partType={partType}
                    partName={tryOnOption ? confirmPurchase.option : selected}
                    config={{
                      ...config,
                      [partType === 'nose' ? 'noseStyle' : partType === 'facialHair' ? 'facialHair' : partType]: tryOnOption ? confirmPurchase.option : selected,
                    } as CustomAvatarConfig}
                    size={128}
                  />
                  {/* Holographic foil at the decision moment — makes the part feel collectible */}
                  {(confirmPurchase.isLegendary || confirmPurchase.isEpic) && (
                    <div
                      aria-hidden
                      className={`avatar-foil ${confirmPurchase.isLegendary ? 'avatar-foil-legendary' : ''}`}
                    />
                  )}
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
                  {t(confirmPurchase.isLegendary ? 'avatarBuilder.tiers.legendary' : 'avatarBuilder.tiers.epic')}
                </p>
              )}

              {/* Set-completion pip row — language-neutral (diamond pips + N/M) */}
              {confirmSet && (
                <div className="flex items-center justify-center gap-2 mb-3" data-testid="set-progress">
                  <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: confirmSet.set.color }}>
                    {confirmSet.set.name}
                  </span>
                  <span className="flex gap-1">
                    {Array.from({ length: confirmSet.prog.total }, (_, i) => (
                      <span
                        key={i}
                        className="w-2.5 h-2.5 rotate-45 border-2 rounded-[1px]"
                        style={{
                          borderColor: confirmSet.set.color,
                          background: i < confirmSet.prog.owned ? confirmSet.set.color : 'transparent',
                        }}
                      />
                    ))}
                  </span>
                  <span className="text-[10px] font-black tabular-nums" style={{ color: confirmSet.set.color }}>
                    {confirmSet.prog.complete ? '★' : `${confirmSet.prog.owned}/${confirmSet.prog.total}`}
                  </span>
                </div>
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
                  {t('avatarBuilder.balance')}:{' '}
                  <span className="text-neo-yellow font-bold tabular-nums">
                    {safeToLocaleString(premium.coins, language)}
                  </span>
                  {' → '}
                  <span className="text-neo-white font-bold tabular-nums">
                    {safeToLocaleString(premium.coins - confirmPurchase.price, language)}
                  </span>
                </p>
              )}

              {/* Try-on toggle */}
              <div className="flex justify-center mb-4">
                <button
                  type="button"
                  onClick={tryOnOption ? handleCancelTryOn : handleTryOn}
                  className="text-xs font-bold text-neo-white/80 hover:text-neo-white underline decoration-dotted underline-offset-2"
                >
                  {tryOnOption ? t('avatarBuilder.cancel') : t('avatarBuilder.tryOn')}
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setConfirmPurchase(null); handleCancelTryOn(); }}
                  className="flex-1 px-4 py-2.5 text-neo-white font-bold rounded-neo border-2 border-neo-white/15 hover:border-neo-white/30 transition-colors"
                >
                  {t('avatarBuilder.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPurchase}
                  disabled={premium?.isPurchasing}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 font-bold rounded-neo border-2 border-black shadow-hard-sm transition-colors disabled:opacity-50 hover:scale-[1.03] active:scale-95 ${
                    confirmPurchase.isLegendary
                      ? 'bg-linear-to-r from-amber-500 to-amber-600 text-black'
                      : confirmPurchase.isEpic
                        ? 'bg-linear-to-r from-purple-500 to-purple-600 text-white'
                        : 'bg-neo-lime text-neo-black'
                  }`}
                >
                  <Coins className="w-4 h-4" />
                  {t('avatar.premium.unlock')}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    </div>
  );
}
