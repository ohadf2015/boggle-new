'use client';
import { useEffect } from 'react';
import { m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BlastLevel } from '@/lib/blast/v2/types';

const MODE_COLORS: Record<string, string> = {
  fruits: '#BFFF00', animals: '#00FFFF', food: '#FF1493', ocean: '#00FFFF',
  space: '#8B5CF6', nature: '#BFFF00', sports: '#FF1493', colors: '#BFFF00',
  transport: '#00FFFF', body: '#FF1493', home: '#BFFF00', school: '#00FFFF',
  tools: '#FF1493', weather: '#00FFFF', music: '#BFFF00', jobs: '#FF1493',
  family: '#BFFF00', numbers: '#00FFFF', feelings: '#FF1493',
  mythology: '#8B5CF6', science: '#BFFF00', travel: '#00FFFF',
  art: '#FF1493', time: '#BFFF00', onboarding: '#BFFF00',
};

export function BlastLevelIntroCard({ level, onDismiss }: { level: BlastLevel; onDismiss: () => void }) {
  const { t } = useLanguage();
  useEffect(() => {
    const id = setTimeout(onDismiss, 1500);
    return () => clearTimeout(id);
  }, [onDismiss]);
  const modeColor = MODE_COLORS[level.theme] ?? '#BFFF00';
  return (
    <div
      data-testid="intro-card"
      className="grid place-items-center min-h-screen text-white"
      style={{
        background: `radial-gradient(ellipse 70% 50% at 50% 50%, color-mix(in srgb, ${modeColor} 14%, #0b1530) 0%, #0b1530 70%)`,
      }}
    >
      <div className="space-y-3 text-center px-6">
        <m.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="text-xs uppercase tracking-[0.3em] opacity-70"
        >
          {t('blast.intro.level', `Level ${level.levelNumber}`, { n: String(level.levelNumber) })}
        </m.div>
        <m.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 360 }}
          className="text-4xl font-black uppercase tracking-wide"
          style={{ color: modeColor, textShadow: `3px 3px 0 #0b1530` }}
        >
          {t(`blast.themes.${level.theme}`, level.theme)}
        </m.div>
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 0.35 }}
          className="text-sm"
        >
          {t('blast.intro.wordCount', `${level.words.length} words`, { count: String(level.words.length) })}
        </m.div>
      </div>
    </div>
  );
}
