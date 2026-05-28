'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { createPortal } from 'react-dom';
import { X, Shuffle, Undo2, Download, SmilePlus, Scissors, Eye, Smile, Sparkles, Palette, Coins, Brush } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import AvatarRenderer from './AvatarRenderer';
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

type Category = 'base' | 'hair' | 'eyes' | 'mouth' | 'facialHair' | 'accessories' | 'background';

const CATEGORY_ICONS: Record<Category, typeof X> = {
  base: SmilePlus,
  hair: Scissors,
  eyes: Eye,
  mouth: Smile,
  facialHair: Brush,
  accessories: Sparkles,
  background: Palette,
};

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
}

export default function AvatarBuilderModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  premium,
}: AvatarBuilderModalProps) {
  const { t } = useLanguage();
  const [config, setConfig] = useState<CustomAvatarConfig>(initialConfig ?? DEFAULT_AVATAR_CONFIG);
  const [activeCategory, setActiveCategory] = useState<Category>('base');
  const [previewKey, setPreviewKey] = useState(0);
  const [coinSpendAmount, setCoinSpendAmount] = useState<number | null>(null);
  const historyRef = useRef<CustomAvatarConfig[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setConfig(initialConfig ?? DEFAULT_AVATAR_CONFIG);
    historyRef.current = [];
    setPreviewKey(k => k + 1);
  }, [isOpen, initialConfig]);

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
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 overflow-hidden" role="presentation" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <AdaptiveMotion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-builder-title"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-neo-navy border-3 border-black shadow-hard-lg rounded-neo-lg w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl max-h-full flex flex-col min-h-0 [container-type:inline-size]"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:p-4 border-b-3 border-black">
          <h2 id="avatar-builder-title" className="font-neo-display text-neo-white text-xl font-bold">
            {t('avatarBuilder.title')}
          </h2>
          <div className="flex items-center gap-3">
            {premium && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-neo bg-neo-navy-light border-2 border-neo-yellow/30">
                <Coins size={14} className="text-neo-yellow" />
                <span className="text-neo-yellow font-black text-sm tabular-nums">{premium.coins}</span>
              </div>
            )}
            <button onClick={onClose} className="text-neo-white hover:text-neo-white p-2.5 transition-colors" aria-label={t('common.close')}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Preview — jelly wobble on every change */}
        <div ref={previewRef} className="flex justify-center py-2 sm:py-3 desktop-tall:sm:py-5 shrink-0">
          <AdaptiveMotion.div
            key={previewKey}
            initial={{ scaleX: 1.06, scaleY: 0.94, rotate: -1.5 }}
            animate={{ scaleX: 1, scaleY: 1, rotate: 0 }}
            transition={JELLY_SPRING}
            className="border-3 border-black shadow-hard rounded-neo-lg overflow-hidden cursor-pointer w-[88px] h-[88px] @[24rem]:w-[112px] @[24rem]:h-[112px] @[32rem]:w-[140px] @[32rem]:h-[140px] desktop-tall:@[32rem]:w-[160px] desktop-tall:@[32rem]:h-[160px]"
          >
            <AvatarRenderer config={config} size={160} className="w-full h-full" />
          </AdaptiveMotion.div>
        </div>

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
                  <span className="hidden @[38rem]:inline">{t(cat.labelKey)}</span>
                </AdaptiveMotion.button>
              );
            })}
          </div>
          {/* Right fade to signal scrollable tabs */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-neo-navy to-transparent @[38rem]:hidden" aria-hidden="true" />
        </div>

        {/* Options Grid — animated category transition */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
          <AdaptiveAnimatePresence mode="wait">
            <AdaptiveMotion.div
              key={activeCategory}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.12 }}
            >
              <CategoryOptions
                category={activeCategory}
                config={config}
                updateConfig={updateConfig}
                t={t}
                premium={premium ?? undefined}
                onCoinSpend={setCoinSpendAmount}
              />
            </AdaptiveMotion.div>
          </AdaptiveAnimatePresence>
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
              key={previewKey}
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
      </AdaptiveMotion.div>
    </div>,
    document.body
  );
}

function CategoryIcon({ category }: { category: Category }) {
  const Icon = CATEGORY_ICONS[category];
  return <Icon size={16} />;
}
