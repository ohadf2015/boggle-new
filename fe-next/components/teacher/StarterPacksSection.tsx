'use client';

import { memo, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { STARTER_LESSON_PACKS, type StarterLessonPack } from '@/lib/education/starterLessonPacks';
import { BookOpen, GraduationCap, Globe, Sparkles } from 'lucide-react';
import type { LessonWord } from '@/types/education';

interface StarterPacksSectionProps {
  onSelectPack: (pack: { name: string; description: string; language: string; words: LessonWord[] }) => void;
}

const categoryIcons = {
  general: BookOpen,
  academic: GraduationCap,
  language: Globe,
};

const categoryColors = {
  general: { bg: 'bg-neo-cyan', border: 'border-s-neo-cyan' },
  academic: { bg: 'bg-neo-pink', border: 'border-s-neo-pink' },
  language: { bg: 'bg-neo-lime', border: 'border-s-neo-lime' },
};

function PackCard({
  pack,
  onSelect,
}: {
  pack: StarterLessonPack;
  onSelect: () => void;
}) {
  const { t } = useLanguage();
  const Icon = categoryIcons[pack.category];
  const colors = categoryColors[pack.category];

  return (
    <div
      className={cn(
        'rounded-neo border-3 border-black shadow-hard bg-neo-navy/80',
        'border-s-8',
        colors.border,
        'flex flex-col'
      )}
    >
      <div className="p-5 flex-1">
        <div className="flex items-center gap-3 mb-3">
          <div
            className={cn(
              'w-10 h-10 rounded-neo border-3 border-black flex items-center justify-center shadow-hard-sm',
              colors.bg
            )}
          >
            <Icon className="w-5 h-5 text-black" />
          </div>
          <div>
            <h4 className="text-lg font-neo-display font-black text-neo-white">
              {t(pack.nameKey)}
            </h4>
            <span className="text-xs text-neo-white font-neo-body font-bold uppercase">
              {t('teacher.lesson.words', { count: pack.words.length })}
            </span>
          </div>
        </div>
        <p className="text-sm text-neo-white font-neo-body leading-relaxed">
          {t(pack.descriptionKey)}
        </p>
      </div>
      <div className="px-5 pb-5">
        <button
          onClick={onSelect}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-3',
            'bg-neo-lime text-black border-3 border-black',
            'font-black font-neo-body text-sm rounded-neo shadow-hard-sm',
            'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5',
            'transition-all duration-100'
          )}
        >
          <Sparkles className="w-4 h-4" />
          {t('education.starterPacks.useThisPack')}
        </button>
      </div>
    </div>
  );
}

export const StarterPacksSection = memo<StarterPacksSectionProps>(({ onSelectPack }) => {
  const { t } = useLanguage();

  const handleSelect = useCallback(
    (pack: StarterLessonPack) => {
      onSelectPack({
        name: t(pack.nameKey),
        description: t(pack.descriptionKey),
        language: pack.language,
        words: pack.words,
      });
    },
    [onSelectPack, t]
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-neo-display font-black text-neo-white">
          {t('education.starterPacks.title')}
        </h3>
        <p className="text-sm text-neo-white font-neo-body">
          {t('education.starterPacks.subtitle')}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STARTER_LESSON_PACKS.map((pack) => (
          <PackCard
            key={pack.nameKey}
            pack={pack}
            onSelect={() => handleSelect(pack)}
          />
        ))}
      </div>
    </div>
  );
});

StarterPacksSection.displayName = 'StarterPacksSection';
export default StarterPacksSection;
