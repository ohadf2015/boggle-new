'use client';

import { useState } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import {
  Hand, Sparkles, Target, BookOpen, Zap, HelpCircle,
  Gem, Bomb, Rainbow, Diamond, Snowflake, Magnet, Shuffle, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { BlastCodexModal } from './BlastCodexModal';
import type { BlastComboType } from './utils/blastCombos';

interface BlastReadyScreenProps {
  onStart: () => void;
  onStartFromWave?: (wave: number) => void;
  savedWave?: number;
  discoveredCombos?: Set<BlastComboType>;
}

/** Compact inline tile hint */
function TileHint({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/8 border border-white/10">
      <span style={{ color }}>{icon}</span>
      <span className="text-[10px] font-bold text-white/70 whitespace-nowrap">{label}</span>
    </div>
  );
}

const STEPS = [
  { key: 'step1', Icon: Hand, color: 'text-neo-cyan', titleKey: 'blast.ready.step1Title', descKey: 'blast.ready.step1Desc' },
  { key: 'step2', Icon: Sparkles, color: 'text-neo-orange', titleKey: 'blast.ready.step2Title', descKey: 'blast.ready.step2Desc' },
  { key: 'step3', Icon: Target, color: 'text-neo-pink', titleKey: 'blast.ready.step3Title', descKey: 'blast.ready.step3Desc' },
] as const;

export function BlastReadyScreen({ onStart, onStartFromWave, savedWave, discoveredCombos }: BlastReadyScreenProps) {
  const { t } = useLanguage();
  const [isCodexOpen, setIsCodexOpen] = useState(false);
  const [showTiles, setShowTiles] = useState(false);

  return (
    <div className="flex-1 flex flex-col items-center overflow-y-auto px-4 py-6 gap-4">
      {/* Title */}
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="text-center shrink-0"
      >
        <h1 className="text-4xl font-black uppercase text-white font-neo-display">
          {t('blast.ready.title')}
        </h1>
        <p className="text-xs font-bold text-white/60 mt-1">
          {t('blast.ready.subtitle')}
        </p>
      </AdaptiveMotion.div>

      {/* Combined steps — compact horizontal pills */}
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-sm shrink-0 space-y-2"
      >
        {STEPS.map((step) => (
          <div key={step.key} className="flex items-center gap-3 px-3 py-2">
            <step.Icon className={`h-5 w-5 shrink-0 ${step.color}`} />
            <div className="min-w-0">
              <span className="font-black text-xs text-white uppercase">{t(step.titleKey)}</span>
              <span className="text-[11px] text-white/50 ms-1.5">{t(step.descKey)}</span>
            </div>
          </div>
        ))}
      </AdaptiveMotion.div>

      {/* Expandable tile guide */}
      <AdaptiveMotion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm shrink-0"
      >
        <button
          data-testid="tile-guide-toggle"
          onClick={() => setShowTiles(prev => !prev)}
          className="flex items-center justify-center gap-2 w-full py-2 text-white/50 hover:text-white/70 transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wide">{t('blast.ready.tileGuide')}</span>
          <span className={`text-[10px] transition-transform ${showTiles ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {showTiles && (
          <div className="flex flex-wrap gap-1.5 justify-center px-2 pb-2">
            <TileHint icon={<Gem className="w-3 h-3" />} label={t('blast.helpGoldLabel') as string} color="#FBBF24" />
            <TileHint icon={<Star className="w-3 h-3" />} label={t('blast.helpSilverLabel') as string} color="#D1D5DB" />
            <TileHint icon={<Diamond className="w-3 h-3" />} label={t('blast.helpDiamondLabel') as string} color="#67E8F9" />
            <TileHint icon={<Rainbow className="w-3 h-3" />} label={t('blast.helpRainbowLabel') as string} color="#C084FC" />
            <TileHint icon={<Bomb className="w-3 h-3" />} label={t('blast.helpBombLabel') as string} color="#F87171" />
            <TileHint icon={<Zap className="w-3 h-3" />} label={t('blast.helpLightningLabel') as string} color="#FDE047" />
            <TileHint icon={<Magnet className="w-3 h-3" />} label={t('blast.helpMagnetLabel') as string} color="#C084FC" />
            <TileHint icon={<Shuffle className="w-3 h-3" />} label={t('blast.helpMirrorLabel') as string} color="#A5B4FC" />
            <TileHint icon={<Snowflake className="w-3 h-3" />} label={t('blast.helpIceLabel') as string} color="#BAE6FD" />
            <TileHint icon={<Sparkles className="w-3 h-3" />} label={t('blast.helpPrismLabel') as string} color="#F9A8D4" />
          </div>
        )}
      </AdaptiveMotion.div>

      {/* CTA — sticky at bottom */}
      <div className="w-full max-w-sm mt-auto shrink-0 space-y-2.5 pb-2">
        <Button
          data-testid="play-button"
          size="lg"
          onClick={() => onStart()}
          className="w-full min-h-[56px] font-black text-xl uppercase border-3 border-neo-black shadow-hard-lg bg-neo-yellow text-neo-black hover:bg-neo-yellow/90"
        >
          {t('blast.ready.play')}
        </Button>
        {onStartFromWave && savedWave && savedWave > 1 && (
          <button
            data-testid="resume-wave-button"
            onClick={() => onStartFromWave(savedWave)}
            className="flex items-center justify-center gap-2 w-full min-h-[44px] font-black text-sm uppercase border-3 border-neo-cyan/50 shadow-hard-sm rounded-neo bg-neo-cyan/15 hover:bg-neo-cyan/25 text-neo-cyan transition-colors"
          >
            <Zap className="h-4 w-4" />
            {t('blast.ready.resumeWave', { wave: String(savedWave) })}
          </button>
        )}
        <button
          data-testid="codex-button"
          onClick={() => setIsCodexOpen(true)}
          className="flex items-center justify-center gap-2 w-full min-h-[36px] font-bold text-xs uppercase border-2 border-white/20 rounded-neo bg-white/5 hover:bg-white/10 text-white/60 transition-colors"
        >
          <BookOpen className="h-3.5 w-3.5" />
          {t('blast.comboCodex')}
        </button>
      </div>

      <BlastCodexModal
        isOpen={isCodexOpen}
        onClose={() => setIsCodexOpen(false)}
        discoveredCombos={discoveredCombos ?? new Set()}
      />
    </div>
  );
}
