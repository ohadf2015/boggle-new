'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { createPortal } from 'react-dom';
import { X, Shuffle, Undo2, Download, Coins, History, Eye, EyeOff } from 'lucide-react';
import { AVATAR_CATEGORY_ICONS } from './AvatarCategoryIcons';
import { useLanguage } from '@/contexts/LanguageContext';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Reveal } from '@/components/ui/Reveal';
import AvatarRenderer from './AvatarRenderer';
import AvatarTierEffects, { getAvatarTier, getAvatarVisualTier, type Tier } from './AvatarTierEffects';
import AvatarEquipBurst from './AvatarEquipBurst';
import GlowUpButton from './GlowUpButton';
import { LobbyAvatarRewardButton } from './LobbyAvatarRewardButton';
import { planEquipBurst, type EquipBurst } from '@/lib/avatar/equipBurst';
import FloatingCoinAnimation from '@/components/game/FloatingCoinAnimation';
import CategoryOptions from './AvatarBuilderCategoryOptions';
import {
  type CustomAvatarConfig,
  DEFAULT_AVATAR_CONFIG,
  getRandomAvatarConfig,
  FEMALE_HAIR_STYLES,
  MALE_HAIR_STYLES,
  DEFAULT_FEMALE_HAIR,
  DEFAULT_MALE_HAIR,
} from '@/shared/types/customAvatar';
import { AVATAR_SETS, getSetProgress } from '@/lib/avatar/avatarSets';

type Category = 'base' | 'hair' | 'eyes' | 'mouth' | 'facialHair' | 'accessories' | 'background';


const ALL_CATEGORIES: { key: Category; labelKey: string; maleOnly?: boolean }[] = [
  { key: 'base', labelKey: 'avatarBuilder.base' },
  { key: 'hair', labelKey: 'avatarBuilder.hair' },
  { key: 'eyes', labelKey: 'avatarBuilder.eyes' },
  { key: 'mouth', labelKey: 'avatarBuilder.mouth' },
  { key: 'facialHair', labelKey: 'avatarBuilder.facialHair', maleOnly: true },
  { key: 'accessories', labelKey: 'avatarBuilder.accessories' },
  { key: 'background', labelKey: 'avatarBuilder.background' },
];

// Jelly wobble for avatar preview (from animate-ai: playful-wobble-jelly)
const JELLY_SPRING = { type: 'spring' as const, stiffness: 200, damping: 8 };

// Bounce button spring (from animate-ai: playful-spring-bounce-button)
const BUTTON_SPRING = { type: 'spring' as const, stiffness: 400, damping: 17 };

export interface AvatarPremium {
  isPartUnlocked: (category: string, value: string) => boolean;
  unlockTemporarily: (category: string, value: string) => void;
  purchaseWithGold: (category: string, partId: string) => Promise<boolean>;
  isPurchasing: boolean;
  permanentUnlocks: string[];
  coins: number;
}

interface AvatarBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: CustomAvatarConfig) => void;
  initialConfig?: CustomAvatarConfig;
  /** Pass premium context to gate parts, or `null` to explicitly allow only free parts (e.g. onboarding). */
  premium: AvatarPremium | null;
  /** The player's previously-saved avatar — enables a "restore previous" action. */
  previousConfig?: CustomAvatarConfig | null;
}

export default function AvatarBuilderModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  premium,
  previousConfig,
}: AvatarBuilderModalProps) {
  const { t, language } = useLanguage();
  const [config, setConfig] = useState<CustomAvatarConfig>(initialConfig ?? DEFAULT_AVATAR_CONFIG);
  const [activeCategory, setActiveCategory] = useState<Category>('base');
  const [previewKey, setPreviewKey] = useState(0);
  // Spins the shuffle glyph ONLY on randomize — keyed off previewKey would
  // re-spin it on every part tweak, which both looks odd and re-runs the spring.
  const [randomizeKey, setRandomizeKey] = useState(0);
  const [coinSpendAmount, setCoinSpendAmount] = useState<number | null>(null);
  const historyRef = useRef<CustomAvatarConfig[]>([]);
  // Equip "snap" burst — fires over the preview when an equip changes the tier.
  const [equipBurst, setEquipBurst] = useState<EquipBurst | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const lastTierRef = useRef<Tier>('free');

  useEffect(() => {
    if (!isOpen) return;
    const start = initialConfig ?? DEFAULT_AVATAR_CONFIG;
    setConfig(start);
    historyRef.current = [];
    lastTierRef.current = getAvatarTier(start);
    setEquipBurst(null);
    setPreviewKey(k => k + 1);
  }, [isOpen, initialConfig]);

  // Re-plan the burst whenever the equipped config changes tier-relevant parts.
  useEffect(() => {
    if (!isOpen) return;
    const newTier = getAvatarTier(config);
    const plan = planEquipBurst(lastTierRef.current, newTier);
    lastTierRef.current = newTier;
    if (plan.particles > 0) setEquipBurst(plan);
  }, [config, isOpen]);

  const pushHistory = useCallback((current: CustomAvatarConfig) => {
    historyRef.current = [...historyRef.current.slice(-19), current];
  }, []);

  const updateConfig = useCallback(<K extends keyof CustomAvatarConfig>(key: K, value: CustomAvatarConfig[K]) => {
    setConfig(prev => {
      pushHistory(prev);
      const next = { ...prev, [key]: value };
      // Auto-switch hair when changing gender if current hair isn't available
      if (key === 'gender') {
        const hairList = value === 'female' ? FEMALE_HAIR_STYLES : MALE_HAIR_STYLES;
        if (!(hairList as readonly string[]).includes(prev.hair)) {
          next.hair = value === 'female' ? DEFAULT_FEMALE_HAIR : DEFAULT_MALE_HAIR;
        }
        if (value === 'female') {
          next.facialHair = 'none';
        }
      }
      return next;
    });
    setPreviewKey(k => k + 1);
  }, [pushHistory]);

  const handleRandomize = useCallback(() => {
    setConfig(prev => {
      pushHistory(prev);
      return getRandomAvatarConfig();
    });
    setPreviewKey(k => k + 1);
    setRandomizeKey(k => k + 1);
  }, [pushHistory]);

  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current.pop()!;
    setConfig(prev);
    setPreviewKey(k => k + 1);
  }, []);

  const handleSave = useCallback(() => {
    onSave(config);
    onClose();
  }, [config, onSave, onClose]);

  const handleRestorePrevious = useCallback(() => {
    if (!previousConfig) return;
    setConfig(prev => {
      pushHistory(prev);
      return previousConfig;
    });
    setPreviewKey(k => k + 1);
  }, [previousConfig, pushHistory]);

  const previewRef = useRef<HTMLDivElement>(null);
  const handleDownload = useCallback(() => {
    const svgEl = previewRef.current?.querySelector('svg');
    if (!svgEl) return;
    const clone = svgEl.cloneNode(true) as SVGElement;
    clone.setAttribute('width', '512');
    clone.setAttribute('height', '512');
    const xml = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const link = document.createElement('a');
      link.download = 'my-avatar.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = url;
  }, []);

  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 pb-[calc(1rem+min(var(--admob-banner-height,0px),120px)+min(var(--web-anchor-ad-height,0px),120px))] overflow-hidden" role="presentation" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <Reveal
        ref={dialogRef as React.Ref<HTMLElement>}
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-builder-title"
        className="bg-neo-navy border-3 border-black shadow-hard-lg rounded-neo-lg w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl max-h-full flex flex-col min-h-0 [container-type:inline-size]"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:p-4 border-b-3 border-black">
          <h2 id="avatar-builder-title" className="font-neo-display text-neo-white text-xl font-bold">
            {t('avatarBuilder.title')}
          </h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPreviewMode(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-neo border-2 text-xs font-black transition-colors ${
                previewMode
                  ? 'bg-neo-lime/20 border-neo-lime text-neo-lime'
                  : 'bg-neo-navy-light border-neo-white/20 text-neo-white hover:border-neo-white/40'
              }`}
              title={t('avatarBuilder.previewMode')}
            >
              {previewMode ? <Eye size={14} /> : <EyeOff size={14} />}
              <span className="hidden @[28rem]:inline">{t('avatarBuilder.previewMode')}</span>
            </button>
            {premium && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-neo bg-neo-navy-light border-2 border-neo-yellow/30">
                <Coins size={14} className="text-neo-yellow" />
                <span className="text-neo-yellow font-black text-sm tabular-nums">{safeToLocaleString(premium.coins, language)}</span>
              </div>
            )}
            <button type="button" onClick={onClose} className="text-neo-white hover:text-neo-white p-2.5 transition-colors" aria-label={t('common.close')}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Preview — jelly wobble on every change + equip "snap" burst */}
        <div ref={previewRef} className="flex justify-center py-2 sm:py-3 desktop-tall:sm:py-5 shrink-0">
          <div className="relative">
            <AdaptiveMotion.div
              key={previewKey}
              initial={{ scaleX: 1.06, scaleY: 0.94, rotate: -1.5 }}
              animate={{ scaleX: 1, scaleY: 1, rotate: 0 }}
              transition={JELLY_SPRING}
              className="border-3 border-black shadow-hard rounded-neo-lg overflow-hidden cursor-pointer w-[88px] h-[88px] @[24rem]:w-[112px] @[24rem]:h-[112px] @[32rem]:w-[140px] @[32rem]:h-[140px] desktop-tall:@[32rem]:w-[160px] desktop-tall:@[32rem]:h-[160px]"
            >
              {previewMode ? (
                <AvatarTierEffects config={config} className="w-full h-full">
                  <AvatarRenderer config={config} size={160} className="w-full h-full" />
                </AvatarTierEffects>
              ) : (
                <AvatarRenderer config={config} size={160} className="w-full h-full" />
              )}
            </AdaptiveMotion.div>
            <AvatarEquipBurst burst={equipBurst} fireKey={previewKey} />
            {previewMode && (
              <div className="absolute -bottom-6 inset-x-0 text-center">
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  getAvatarVisualTier(config) === 'legendary' ? 'text-amber-300'
                  : getAvatarVisualTier(config) === 'epic' ? 'text-neo-yellow'
                  : getAvatarVisualTier(config) === 'rare' ? 'text-neo-white'
                  : 'text-neo-white/60'
                }`}>
                  {t(`avatarBuilder.tiers.${getAvatarVisualTier(config)}`)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Admin-only: AI Glow-Up of the built avatar (Track B) */}
        <GlowUpButton previewRef={previewRef} config={config} />

        {/* Optional reward: watch a short ad to unlock a random premium avatar
            part (1/day). This is where the old lobby "watch ad" CTA now lives —
            in-context, right where you're browsing parts, and purely opt-in.
            Self-hides when unavailable (no ad provider / anon / all owned), so
            the row collapses cleanly. */}
        <div className="flex justify-center px-3 pb-1 shrink-0 empty:hidden" data-testid="avatar-builder-reward-slot">
          <LobbyAvatarRewardButton />
        </div>

        {/* Set completion progress */}
        {premium && (
          <div className="px-3 sm:px-4 pb-2 shrink-0">
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {AVATAR_SETS.map(set => {
                const ownedKeys = set.parts.filter(k => {
                  const [c, i] = k.split(':');
                  return premium.isPartUnlocked(c, i);
                });
                const prog = getSetProgress(set, ownedKeys);
                return (
                  <div
                    key={set.id}
                    className="shrink-0 flex items-center gap-1.5 px-2 py-1.5 rounded-neo bg-neo-navy-light border border-neo-white/10"
                    title={t(`avatarBuilder.sets.${set.id}`)}
                  >
                    <span className="text-[10px] font-black uppercase" style={{ color: set.color }}>
                      {t(`avatarBuilder.sets.${set.id}`)}
                    </span>
                    <span className="flex gap-0.5">
                      {Array.from({ length: prog.total }, (_, i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rotate-45 border rounded-[1px]"
                          style={{
                            borderColor: set.color,
                            background: i < prog.owned ? set.color : 'transparent',
                          }}
                        />
                      ))}
                    </span>
                    <span className="text-[9px] font-black tabular-nums text-neo-white/70">
                      {prog.owned}/{prog.total}
                    </span>
                    {prog.complete && (
                      <span className="text-[9px]" aria-label={t('avatarBuilder.completeSet')}>★</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category Tabs — scroll-snap row, icon-only on narrow, icon+label when room */}
        <div className="relative shrink-0">
          <div
            className="flex gap-1 overflow-x-auto px-3 sm:px-4 py-1 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label={t('avatarBuilder.title')}
          >
            {ALL_CATEGORIES.filter(c => !c.maleOnly || config.gender === 'male').map(cat => {
              const isActive = activeCategory === cat.key;
              return (
                <AdaptiveMotion.button
                  key={cat.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveCategory(cat.key)}
                  whileTap={{ scale: 0.92 }}
                  transition={BUTTON_SPRING}
                  className={`shrink-0 snap-start min-h-[40px] flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs @[38rem]:text-sm font-bold rounded-neo whitespace-nowrap border-2 transition-colors ${
                    isActive
                      ? 'bg-neo-lime text-neo-black border-black shadow-hard-sm'
                      : 'bg-neo-navy-light text-neo-white border-transparent hover:border-neo-white/30 hover:bg-neo-navy-light/80'
                  }`}
                  title={t(cat.labelKey)}
                >
                  <CategoryIcon category={cat.key} />
                  {/* Active tab always shows its name — the glyph alone is ambiguous on phones
                      where inactive labels stay hidden. The row scrolls, so this costs no layout. */}
                  <span className={isActive ? 'inline' : 'hidden @[38rem]:inline'}>{t(cat.labelKey)}</span>
                </AdaptiveMotion.button>
              );
            })}
          </div>
          {/* Right fade to signal scrollable tabs */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-neo-navy to-transparent @[38rem]:hidden" aria-hidden="true" />
        </div>

        {/* Options Grid — animated category transition.
            onMouseDown guard: stop a pointer click from focusing a part/colour
            button and scroll-jumping the list to reveal it (worst on short
            viewports). Click + keyboard Tab focus are unaffected. */}
        <div
          className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0"
          onMouseDown={(e) => { if (shouldSuppressPointerFocus(e.target)) e.preventDefault(); }}
        >
          {/* Keyed CSS entrance (animate-in) instead of framer: a starved JS
              loop would leave the options grid pinned at its invisible `initial`
              state. Re-mounting on `key={activeCategory}` replays the CSS slide;
              CSS runs off the main thread and always settles visible. */}
          <div
            key={activeCategory}
            className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
          >
            <CategoryOptions
              category={activeCategory}
              config={config}
              updateConfig={updateConfig}
              t={t}
              premium={premium ?? undefined}
              onCoinSpend={setCoinSpendAmount}
            />
          </div>
        </div>

        {/* Actions — single row, secondary icon-only on narrow */}
        <div className="flex items-center gap-1.5 sm:gap-2 p-3 sm:p-4 border-t-3 border-black shrink-0 bg-neo-navy">
          <AdaptiveMotion.button
            onClick={handleRandomize}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            transition={BUTTON_SPRING}
            className="inline-flex items-center gap-1.5 px-2.5 @[24rem]:px-3 py-2 bg-neo-purple text-neo-white font-bold rounded-neo border-2 border-black shadow-hard-sm transition-shadow shrink-0"
            title={t('avatarBuilder.randomize')}
            aria-label={t('avatarBuilder.randomize')}
          >
            <AdaptiveMotion.span
              key={randomizeKey}
              initial={{ rotate: 180 }}
              animate={{ rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="inline-flex"
            >
              <Shuffle size={16} />
            </AdaptiveMotion.span>
            <span className="hidden @[26rem]:inline text-sm">{t('avatarBuilder.randomize')}</span>
          </AdaptiveMotion.button>
          <AdaptiveMotion.button
            onClick={handleUndo}
            whileTap={{ scale: 0.88, rotate: -20 }}
            transition={BUTTON_SPRING}
            disabled={historyRef.current.length === 0}
            className="inline-flex items-center justify-center w-9 h-9 bg-neo-navy-light text-neo-white rounded-neo border-2 border-neo-white/20 hover:border-neo-white/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
            title={t('avatarBuilder.undo')}
            aria-label={t('avatarBuilder.undo')}
          >
            <Undo2 size={16} />
          </AdaptiveMotion.button>
          {previousConfig && (
            <AdaptiveMotion.button
              onClick={handleRestorePrevious}
              whileTap={{ scale: 0.88 }}
              transition={BUTTON_SPRING}
              className="inline-flex items-center justify-center w-9 h-9 bg-neo-navy-light text-neo-white rounded-neo border-2 border-neo-white/20 hover:border-neo-white/50 transition-all shrink-0"
              title={t('avatarBuilder.restorePrevious')}
              aria-label={t('avatarBuilder.restorePrevious')}
            >
              <History size={16} />
            </AdaptiveMotion.button>
          )}
          <AdaptiveMotion.button
            onClick={handleDownload}
            whileTap={{ scale: 0.88 }}
            transition={BUTTON_SPRING}
            className="inline-flex items-center justify-center w-9 h-9 bg-neo-navy-light text-neo-white rounded-neo border-2 border-neo-white/20 hover:border-neo-white/50 transition-all shrink-0"
            title={t('avatarBuilder.download') || 'Download'}
            aria-label={t('avatarBuilder.download') || 'Download'}
          >
            <Download size={16} />
          </AdaptiveMotion.button>
          <div className="flex-1 min-w-0" />
          <button
            type="button"
            onClick={onClose}
            className="px-3 @[24rem]:px-4 py-2 text-sm text-neo-white font-bold hover:text-neo-white transition-colors shrink-0"
          >
            {t('avatarBuilder.cancel')}
          </button>
          <AdaptiveMotion.button
            onClick={handleSave}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            transition={BUTTON_SPRING}
            className="px-4 @[24rem]:px-6 py-2 bg-neo-lime text-neo-black font-bold rounded-neo border-2 border-black shadow-hard-sm transition-shadow shrink-0"
          >
            {t('avatarBuilder.save')}
          </AdaptiveMotion.button>
        </div>

        {/* Coin spend animation when purchasing premium parts */}
        <FloatingCoinAnimation
          coinAmount={coinSpendAmount}
          onAnimationComplete={() => setCoinSpendAmount(null)}
        />
      </Reveal>
    </div>,
    document.body
  );
}

function CategoryIcon({ category }: { category: Category }) {
  const Icon = AVATAR_CATEGORY_ICONS[category];
  return <Icon size={20} />;
}

/**
 * True when a pointer-down landed on (or inside) a button. Used to preventDefault
 * the pointer's native focus so clicking a part/colour button near the scroll
 * edge doesn't focus it and scroll the options list into view ("jump to start").
 * Keyboard Tab focus is a separate path and stays intact, as does the click.
 */
export function shouldSuppressPointerFocus(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!(el && typeof el.closest === 'function' && el.closest('button'));
}
