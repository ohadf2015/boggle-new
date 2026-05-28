'use client';

import {
  Pencil, Search, Disc3,
  Move, TrendingUp, Compass, Target, Route, Disc, Hand, Plus,
  ArrowRight, type LucideIcon,
} from 'lucide-react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

const MODE_ACCENT: Record<PracticeMode, string> = {
  classic: 'border-neo-cyan bg-neo-cyan/10',
  wordHunt: 'border-neo-lime bg-neo-lime/10',
  wheelRush: 'border-neo-purple bg-neo-purple/10',
};

const MODE_CTA: Record<PracticeMode, string> = {
  classic: 'bg-neo-cyan text-neo-black',
  wordHunt: 'bg-neo-lime text-neo-black',
  wheelRush: 'bg-neo-purple text-neo-white',
};

// Icon-tile accent (text color) + hard-shadow tint per mode.
const MODE_ICON_TEXT: Record<PracticeMode, string> = {
  classic: 'text-neo-cyan',
  wordHunt: 'text-neo-lime',
  wheelRush: 'text-neo-purple',
};
const MODE_SHADOW_RGB: Record<PracticeMode, string> = {
  classic: '0, 255, 255',
  wordHunt: '191, 255, 0',
  wheelRush: '139, 92, 246',
};

// Header glyph per mode (matches the hub tiles).
const MODE_HEADER_ICON: Record<PracticeMode, LucideIcon> = {
  classic: Pencil,
  wordHunt: Search,
  wheelRush: Disc3,
};

// Per-tip icon triple — same visual language as PracticeTutorialSheet so
// hub → tutorial → in-game stays consistent.
const TIP_ICONS: Record<PracticeMode, [LucideIcon, LucideIcon, LucideIcon]> = {
  classic: [Move, TrendingUp, Compass],
  wordHunt: [Target, Move, Route],
  wheelRush: [Disc, Hand, Plus],
};

interface Props {
  mode: PracticeMode;
  onDismiss: () => void;
}

/**
 * Compact desktop onboarding card — shown once per mode on screens ≥768px
 * instead of the full PracticeTutorialSheet (which is optimised for mobile
 * vertical scroll). The two essential tip lines, in hard-shadow icon tiles
 * with a mode-accent header and a staggered pop-in so the card has personality
 * without gating play. All icons are lucide (no emoji).
 */
export default function PracticeDesktopWelcome({ mode, onDismiss }: Props) {
  const { t } = useLanguage();
  const tipKeys = [1, 2].map((n) => `practice.tips.${mode}.line${n}`);
  const icons = TIP_ICONS[mode];
  const HeaderIcon = MODE_HEADER_ICON[mode];

  return (
    <AdaptiveMotion.div
      data-testid="practice-desktop-welcome"
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className={`w-full max-w-2xl mx-auto mb-4 rounded-neo border-2 ${MODE_ACCENT[mode]} p-4`}
    >
      {/* Header — mode glyph + "How to play" label */}
      <div className="flex items-center gap-2 mb-3">
        <span
          aria-hidden
          className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-neo border-2 border-neo-black bg-neo-navy ${MODE_ICON_TEXT[mode]}`}
          style={{ boxShadow: `2px 2px 0 rgba(${MODE_SHADOW_RGB[mode]}, 0.5)` }}
        >
          <HeaderIcon className="w-4 h-4" strokeWidth={2.5} />
        </span>
        <p className="text-xs font-neo-display font-black uppercase tracking-wider text-neo-white">
          {t('gameModes.tutorial.title')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {tipKeys.map((key, i) => {
          const Icon = icons[i];
          return (
            <div
              key={key}
              className="flex flex-col gap-2 rounded-neo bg-neo-navy/40 border border-neo-black/20 px-3 py-3 animate-neo-pop"
              style={{ animationDelay: `${120 + i * 90}ms`, animationFillMode: 'both' }}
            >
              <span
                aria-hidden
                className={`inline-flex items-center justify-center w-9 h-9 rounded-neo border-2 border-neo-black bg-neo-navy ${MODE_ICON_TEXT[mode]}`}
                style={{ boxShadow: `2px 2px 0 rgba(${MODE_SHADOW_RGB[mode]}, 0.45)` }}
              >
                <Icon className="w-5 h-5" strokeWidth={2.5} />
              </span>
              <p className="text-xs font-neo-body text-neo-white leading-snug">
                {t(key)}
              </p>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className={`w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-neo border-2 border-neo-black font-neo-display font-black text-sm shadow-hard active:translate-y-px active:shadow-hard-pressed ${MODE_CTA[mode]}`}
      >
        <span>{t('common.gotIt')}</span>
        <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden />
      </button>
    </AdaptiveMotion.div>
  );
}
