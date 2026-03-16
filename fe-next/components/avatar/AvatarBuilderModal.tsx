'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { X, Shuffle, Undo2, SmilePlus, Scissors, Eye, Smile, Sparkles, Palette } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import AvatarRenderer from './AvatarRenderer';
import PartPreview from './PartPreview';
import {
  type CustomAvatarConfig,
  AVATAR_GENDERS,
  AVATAR_BASES,
  AVATAR_SKIN_COLORS,
  AVATAR_HAIR_STYLES,
  AVATAR_HAIR_COLORS,
  AVATAR_EYE_STYLES,
  AVATAR_MOUTH_STYLES,
  AVATAR_ACCESSORIES,
  AVATAR_ACCESSORY_COLORS,
  AVATAR_BG_COLORS,
  DEFAULT_AVATAR_CONFIG,
  getRandomAvatarConfig,
} from '@/shared/types/customAvatar';

type Category = 'base' | 'hair' | 'eyes' | 'mouth' | 'accessories' | 'background';

const CATEGORY_ICONS: Record<Category, typeof X> = {
  base: SmilePlus,
  hair: Scissors,
  eyes: Eye,
  mouth: Smile,
  accessories: Sparkles,
  background: Palette,
};

const CATEGORIES: { key: Category; labelKey: string }[] = [
  { key: 'base', labelKey: 'avatar.builder.base' },
  { key: 'hair', labelKey: 'avatar.builder.hair' },
  { key: 'eyes', labelKey: 'avatar.builder.eyes' },
  { key: 'mouth', labelKey: 'avatar.builder.mouth' },
  { key: 'accessories', labelKey: 'avatar.builder.accessories' },
  { key: 'background', labelKey: 'avatar.builder.background' },
];

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

// Jelly wobble for avatar preview (from animate-ai: playful-wobble-jelly)
const JELLY_SPRING = { type: 'spring' as const, stiffness: 200, damping: 8 };

// Bounce button spring (from animate-ai: playful-spring-bounce-button)
const BUTTON_SPRING = { type: 'spring' as const, stiffness: 400, damping: 17 };

interface AvatarBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: CustomAvatarConfig) => void;
  initialConfig?: CustomAvatarConfig;
}

export default function AvatarBuilderModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: AvatarBuilderModalProps) {
  const { t } = useLanguage();
  const [config, setConfig] = useState<CustomAvatarConfig>(initialConfig ?? DEFAULT_AVATAR_CONFIG);
  const [activeCategory, setActiveCategory] = useState<Category>('base');
  const [previewKey, setPreviewKey] = useState(0);
  const historyRef = useRef<CustomAvatarConfig[]>([]);

  const pushHistory = useCallback((current: CustomAvatarConfig) => {
    historyRef.current = [...historyRef.current.slice(-19), current];
  }, []);

  const updateConfig = useCallback(<K extends keyof CustomAvatarConfig>(key: K, value: CustomAvatarConfig[K]) => {
    setConfig(prev => {
      pushHistory(prev);
      return { ...prev, [key]: value };
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

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" role="presentation" onClick={onClose}>
      <AdaptiveMotion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-builder-title"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-neo-navy border-3 border-black shadow-hard-lg rounded-neo-lg w-full max-w-[95vw] sm:max-w-lg mx-4 max-h-[85dvh] sm:max-h-[90vh] flex flex-col"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:p-4 border-b-3 border-black">
          <h2 id="avatar-builder-title" className="font-neo-display text-neo-white text-xl font-bold">
            {t('avatar.builder.title')}
          </h2>
          <button onClick={onClose} className="text-neo-white/60 hover:text-neo-white p-1 transition-colors" aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        {/* Preview — jelly wobble on every change */}
        <div className="flex justify-center py-2 sm:py-5">
          <AdaptiveMotion.div
            key={previewKey}
            initial={{ scaleX: 1.06, scaleY: 0.94, rotate: -1.5 }}
            animate={{ scaleX: 1, scaleY: 1, rotate: 0 }}
            transition={JELLY_SPRING}
            className="border-3 border-black shadow-hard rounded-neo-lg overflow-hidden cursor-pointer w-[88px] h-[88px] sm:w-[160px] sm:h-[160px]"
          >
            <AvatarRenderer config={config} size={160} />
          </AdaptiveMotion.div>
        </div>

        {/* Category Tabs with icons + spring bounce */}
        <div className="flex px-3 sm:px-4 gap-0.5">
          {CATEGORIES.map(cat => (
            <AdaptiveMotion.button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              whileTap={{ scale: 0.92 }}
              transition={BUTTON_SPRING}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs sm:text-sm font-bold rounded-neo whitespace-nowrap border-2 transition-colors ${
                activeCategory === cat.key
                  ? 'bg-neo-lime text-neo-black border-black shadow-hard-sm'
                  : 'bg-neo-navy-light text-neo-white/70 border-transparent hover:border-neo-white/30 hover:bg-neo-navy-light/80'
              }`}
            >
              <CategoryIcon category={cat.key} />
              <span className="hidden sm:inline">{t(cat.labelKey)}</span>
            </AdaptiveMotion.button>
          ))}
        </div>

        {/* Options Grid — animated category transition */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-[120px] sm:min-h-[200px]">
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
              />
            </AdaptiveMotion.div>
          </AdaptiveAnimatePresence>
        </div>

        {/* Actions — spring bounce buttons */}
        <div className="flex flex-wrap gap-2 p-3 sm:p-4 border-t-3 border-black">
          <AdaptiveMotion.button
            onClick={handleRandomize}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            transition={BUTTON_SPRING}
            className="flex items-center gap-1.5 px-3 py-2 bg-neo-purple text-neo-white font-bold rounded-neo border-2 border-black shadow-hard-sm transition-shadow"
            title={t('avatar.builder.randomize')}
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
            <span className="hidden xs:inline">{t('avatar.builder.randomize')}</span>
          </AdaptiveMotion.button>
          <AdaptiveMotion.button
            onClick={handleUndo}
            whileTap={{ scale: 0.88, rotate: -20 }}
            transition={BUTTON_SPRING}
            disabled={historyRef.current.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-neo-navy-light text-neo-white/70 font-bold rounded-neo border-2 border-neo-white/20 hover:border-neo-white/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title={t('avatar.builder.undo')}
          >
            <Undo2 size={16} />
          </AdaptiveMotion.button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 text-neo-white/70 font-bold hover:text-neo-white transition-colors"
          >
            {t('avatar.builder.cancel')}
          </button>
          <AdaptiveMotion.button
            onClick={handleSave}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            transition={BUTTON_SPRING}
            className="w-full xs:w-auto px-6 py-2 bg-neo-lime text-neo-black font-bold rounded-neo border-2 border-black shadow-hard-sm transition-shadow"
          >
            {t('avatar.builder.save')}
          </AdaptiveMotion.button>
        </div>
      </AdaptiveMotion.div>
    </div>
  );
}

function CategoryIcon({ category }: { category: Category }) {
  const Icon = CATEGORY_ICONS[category];
  return <Icon size={16} />;
}

// ==================== Category Options ====================

interface CategoryOptionsProps {
  category: Category;
  config: CustomAvatarConfig;
  updateConfig: <K extends keyof CustomAvatarConfig>(key: K, value: CustomAvatarConfig[K]) => void;
  t: (key: string) => string;
}

function CategoryOptions({ category, config, updateConfig, t }: CategoryOptionsProps) {
  switch (category) {
    case 'base':
      return (
        <div className="space-y-3">
          <GenderToggle
            selected={config.gender}
            onSelect={v => updateConfig('gender', v)}
            t={t}
          />
          <PartPreviewGrid
            label={t('avatar.builder.shape')}
            partType="base"
            options={AVATAR_BASES}
            selected={config.base}
            onSelect={v => updateConfig('base', v)}
            config={config}
          />
          <ColorStrip
            label={t('avatar.builder.skinColor')}
            colors={AVATAR_SKIN_COLORS}
            selected={config.skinColor}
            onSelect={v => updateConfig('skinColor', v)}
          />
        </div>
      );
    case 'hair':
      return (
        <div className="space-y-3">
          <PartPreviewGrid
            label={t('avatar.builder.style')}
            partType="hair"
            options={AVATAR_HAIR_STYLES}
            selected={config.hair}
            onSelect={v => updateConfig('hair', v)}
            config={config}
            noneLabel={t('avatar.builder.none')}
          />
          <ColorStrip
            label={t('avatar.builder.hairColor')}
            colors={AVATAR_HAIR_COLORS}
            selected={config.hairColor}
            onSelect={v => updateConfig('hairColor', v)}
          />
        </div>
      );
    case 'eyes':
      return (
        <PartPreviewGrid
          label={t('avatar.builder.style')}
          partType="eyes"
          options={AVATAR_EYE_STYLES}
          selected={config.eyes}
          onSelect={v => updateConfig('eyes', v)}
          config={config}
        />
      );
    case 'mouth':
      return (
        <PartPreviewGrid
          label={t('avatar.builder.style')}
          partType="mouth"
          options={AVATAR_MOUTH_STYLES}
          selected={config.mouth}
          onSelect={v => updateConfig('mouth', v)}
          config={config}
        />
      );
    case 'accessories':
      return (
        <div className="space-y-3">
          <PartPreviewGrid
            label={t('avatar.builder.type')}
            partType="accessory"
            options={AVATAR_ACCESSORIES}
            selected={config.accessory}
            onSelect={v => updateConfig('accessory', v)}
            config={config}
            noneLabel={t('avatar.builder.none')}
          />
          {config.accessory !== 'none' && (
            <ColorStrip
              label={t('avatar.builder.accessoryColor')}
              colors={AVATAR_ACCESSORY_COLORS}
              selected={config.accessoryColor}
              onSelect={v => updateConfig('accessoryColor', v)}
            />
          )}
        </div>
      );
    case 'background':
      return (
        <ColorStrip
          label={t('avatar.builder.bgColor')}
          colors={AVATAR_BG_COLORS}
          selected={config.bgColor}
          onSelect={v => updateConfig('bgColor', v)}
          large
        />
      );
  }
}

// ==================== Part Preview Grid (with staggered entrance) ====================

interface PartPreviewGridProps<T extends string> {
  label: string;
  partType: 'base' | 'eyes' | 'mouth' | 'hair' | 'accessory';
  options: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
  config: CustomAvatarConfig;
  noneLabel?: string;
}

function PartPreviewGrid<T extends string>({
  label,
  partType,
  options,
  selected,
  onSelect,
  config,
  noneLabel,
}: PartPreviewGridProps<T>) {
  return (
    <div>
      <p className="text-neo-white/60 text-xs font-bold uppercase mb-2">{label}</p>
      <AdaptiveMotion.div
        variants={gridContainerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-3 sm:grid-cols-4 gap-2"
      >
        {options.map(option => (
          <AdaptiveMotion.button
            key={option}
            variants={gridItemVariants}
            onClick={() => onSelect(option)}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.88 }}
            transition={BUTTON_SPRING}
            className={`relative flex flex-col items-center gap-1 p-1.5 rounded-neo border-2 transition-colors ${
              selected === option
                ? 'bg-neo-lime/15 border-neo-lime shadow-hard-sm ring-1 ring-neo-lime/30'
                : 'bg-neo-navy-light border-neo-white/15 hover:border-neo-white/40 hover:bg-neo-navy-light/80'
            }`}
          >
            <div className="w-12 h-12 flex items-center justify-center">
              {option === 'none' ? (
                <span className="text-neo-white/40 text-xs font-bold">{noneLabel ?? '—'}</span>
              ) : (
                <PartPreview partType={partType} partName={option} config={config} size={48} />
              )}
            </div>
            <span className={`text-[10px] font-bold capitalize truncate w-full text-center ${
              selected === option ? 'text-neo-lime' : 'text-neo-white/50'
            }`}>
              {option === 'none' ? (noneLabel ?? option) : option}
            </span>
          </AdaptiveMotion.button>
        ))}
      </AdaptiveMotion.div>
    </div>
  );
}

// ==================== Color Strip (with spring feedback) ====================

interface ColorStripProps<T extends string> {
  label: string;
  colors: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
  large?: boolean;
}

// ==================== Gender Toggle ====================

interface GenderToggleProps {
  selected: (typeof AVATAR_GENDERS)[number];
  onSelect: (value: (typeof AVATAR_GENDERS)[number]) => void;
  t: (key: string) => string;
}

function GenderToggle({ selected, onSelect, t }: GenderToggleProps) {
  return (
    <div>
      <p className="text-neo-white/60 text-xs font-bold uppercase mb-2">{t('avatar.builder.gender')}</p>
      <div className="flex gap-2">
        {AVATAR_GENDERS.map(gender => (
          <AdaptiveMotion.button
            key={gender}
            onClick={() => onSelect(gender)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            transition={BUTTON_SPRING}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 font-bold rounded-neo border-2 transition-colors ${
              selected === gender
                ? 'bg-neo-lime/15 border-neo-lime shadow-hard-sm text-neo-lime'
                : 'bg-neo-navy-light border-neo-white/15 hover:border-neo-white/40 text-neo-white/70'
            }`}
          >
            <span className="text-lg">{gender === 'male' ? '♂' : '♀'}</span>
            <span className="text-sm">{t(`avatar.builder.${gender}`)}</span>
          </AdaptiveMotion.button>
        ))}
      </div>
    </div>
  );
}

// ==================== Color Strip (with spring feedback) ====================

function ColorStrip<T extends string>({ label, colors, selected, onSelect, large }: ColorStripProps<T>) {
  const size = large ? 'w-9 h-9 sm:w-11 sm:h-11' : 'w-7 h-7 sm:w-8 sm:h-8';
  return (
    <div>
      <p className="text-neo-white/60 text-xs font-bold uppercase mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {colors.map(color => (
          <AdaptiveMotion.button
            key={color}
            onClick={() => onSelect(color)}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            transition={BUTTON_SPRING}
            className={`${size} rounded-full border-3 transition-shadow ${
              selected === color
                ? 'border-neo-lime shadow-hard-sm ring-2 ring-neo-lime/40'
                : 'border-black hover:border-neo-white/50'
            }`}
            style={{ backgroundColor: color }}
            aria-label={color}
          />
        ))}
      </div>
    </div>
  );
}
