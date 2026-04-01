'use client';

import { memo, useState, useEffect, useCallback } from 'react';
import { Target, Heart, Lightbulb, AlertTriangle } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';

const PANEL_COUNT = 4;
const AUTO_ADVANCE_MS = 4000;

export interface WordHuntQuickRulesProps {
  onDismiss: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

interface RulePanel {
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
  accent: string;
  bgGlow: string;
}

const PANELS: RulePanel[] = [
  {
    icon: <Target size={40} strokeWidth={2.5} />,
    titleKey: 'wordHuntRules.panel1Title',
    descKey: 'wordHuntRules.panel1Desc',
    accent: 'text-neo-pink',
    bgGlow: 'from-neo-pink/20',
  },
  {
    icon: <Heart size={40} strokeWidth={2.5} />,
    titleKey: 'wordHuntRules.panel2Title',
    descKey: 'wordHuntRules.panel2Desc',
    accent: 'text-neo-red',
    bgGlow: 'from-neo-red/20',
  },
  {
    icon: <Lightbulb size={40} strokeWidth={2.5} />,
    titleKey: 'wordHuntRules.panel3Title',
    descKey: 'wordHuntRules.panel3Desc',
    accent: 'text-neo-lime',
    bgGlow: 'from-neo-lime/20',
  },
  {
    icon: <AlertTriangle size={40} strokeWidth={2.5} />,
    titleKey: 'wordHuntRules.panel4Title',
    descKey: 'wordHuntRules.panel4Desc',
    accent: 'text-neo-cyan',
    bgGlow: 'from-neo-cyan/20',
  },
];

/**
 * Pre-game quick rules overlay for Word Hunt MP.
 * 4 swipeable/auto-advancing panels, each teaching one mechanic.
 */
const WordHuntQuickRules = memo<WordHuntQuickRulesProps>(({ onDismiss, t }) => {
  const [activePanel, setActivePanel] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);

  // Auto-advance panels
  useEffect(() => {
    if (!autoAdvance) return;
    const timer = setInterval(() => {
      setActivePanel((prev) => {
        if (prev >= PANEL_COUNT - 1) {
          setAutoAdvance(false);
          return prev;
        }
        return prev + 1;
      });
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [autoAdvance]);

  const handleDotClick = useCallback((index: number) => {
    setActivePanel(index);
    setAutoAdvance(false);
  }, []);

  const panel = PANELS[activePanel];

  return (
    <AdaptiveMotion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-neo-navy/95 px-6"
      data-testid="quick-rules"
    >
      {/* Radial glow behind icon */}
      <div className={cn(
        'absolute inset-0 pointer-events-none bg-radial-gradient to-transparent',
        panel.bgGlow,
      )} style={{ background: `radial-gradient(circle at center, var(--tw-gradient-from) 0%, transparent 60%)` }} />

      {/* Panel content */}
      <AdaptiveAnimatePresence mode="wait">
        <AdaptiveMotion.div
          key={activePanel}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative flex flex-col items-center gap-5 max-w-sm text-center"
          data-testid={`rules-panel-${activePanel}`}
        >
          {/* Icon */}
          <AdaptiveMotion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 250, damping: 15, delay: 0.1 }}
            className={panel.accent}
          >
            {panel.icon}
          </AdaptiveMotion.div>

          {/* Title */}
          <h2 className={cn(
            'font-neo-display font-black text-2xl sm:text-3xl uppercase tracking-wide',
            panel.accent,
          )}>
            {t(panel.titleKey)}
          </h2>

          {/* Description */}
          <p className="text-neo-cream/80 font-neo-body text-base leading-relaxed max-w-[280px]">
            {t(panel.descKey)}
          </p>
        </AdaptiveMotion.div>
      </AdaptiveAnimatePresence>

      {/* Dot indicators */}
      <div className="relative flex gap-2 mt-8" data-testid="rules-dots">
        {PANELS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleDotClick(i)}
            aria-label={t('wordHuntRules.goToPanel', { panel: i + 1 })}
            className={cn(
              'w-2.5 h-2.5 rounded-full border-2 border-neo-white/30 transition-all',
              i === activePanel
                ? 'bg-neo-white scale-125'
                : 'bg-neo-white/20 hover:bg-neo-white/40',
            )}
          />
        ))}
      </div>

      {/* Got it / Skip button */}
      <AdaptiveMotion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        type="button"
        onClick={onDismiss}
        className={cn(
          'relative mt-6 px-8 py-3 rounded-neo border-3 border-neo-black',
          'font-neo-display font-black text-lg uppercase tracking-wider',
          'bg-neo-lime text-neo-black shadow-hard',
          'hover:shadow-hard-lg active:shadow-hard-pressed active:translate-y-0.5',
          'transition-all',
        )}
        data-testid="rules-dismiss"
      >
        {activePanel >= PANEL_COUNT - 1
          ? t('wordHuntRules.gotIt')
          : t('wordHuntRules.skip')
        }
      </AdaptiveMotion.button>

      {/* Panel counter */}
      <span className="relative mt-3 text-[10px] font-bold text-white/30 uppercase tracking-widest">
        {activePanel + 1} / {PANEL_COUNT}
      </span>
    </AdaptiveMotion.div>
  );
});

WordHuntQuickRules.displayName = 'WordHuntQuickRules';
export { WordHuntQuickRules, PANELS, PANEL_COUNT };
