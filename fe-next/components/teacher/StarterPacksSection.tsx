'use client';

import { memo, useCallback, useId, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { STARTER_LESSON_PACKS, type StarterLessonPack } from '@/lib/education/starterLessonPacks';
import { isPackLanguage, type PackLessonInput } from '@/lib/education/themedPacks';
import { BookOpen, GraduationCap, Globe, Plus } from 'lucide-react';
import { actionClass, chipClass, starterGridClass, useThemedPacks } from './StarterPacksSection.data';
import type { Language } from '@/lib/supabase/education/types';
import { ContentLanguageChips, contentLanguagesFor } from '@/components/education/pickers/ContentLanguageChips';
import { SessionTemplatesSection, type SessionRun } from './StarterPacksSection.sessions';
import { ThemedPacksSection } from './StarterPacksSection.themed';

export type { SessionRun } from './StarterPacksSection.sessions';

interface StarterPacksSectionProps {
  onSelectPack: (pack: PackLessonInput) => void;
  /** The class's default language: the chip row starts here. */
  language?: string;
  /** Other languages the teacher teaches in (their lists' languages): one chip each. */
  languages?: readonly (string | null | undefined)[];
  classroomId?: string;
  /** Inside the lobby the run is applied in place; elsewhere Run this links to the lobby. */
  onRunSession?: (run: SessionRun) => void;
}

const categoryIcons = {
  general: BookOpen,
  academic: GraduationCap,
  language: Globe,
};

const categoryTile = {
  general: 'bg-neo-cyan',
  academic: 'bg-neo-pink',
  language: 'bg-neo-lime',
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

  return (
    <article data-testid="starter-pack-card" className="@container rounded-neo border-3 border-neo-cream bg-neo-navy/80 p-4 shadow-hard">
      <div className="flex h-full flex-col gap-3 @2xl:flex-row @2xl:items-center @2xl:gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn(chipClass, 'bg-neo-cream')}>{t('teacher.lesson.words', { count: pack.words.length })}</span>
          </div>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h4 className="font-neo-display text-lg font-black text-neo-white">{t(pack.nameKey)}</h4>
              <p className="mt-1 line-clamp-2 font-neo-body text-sm leading-relaxed text-neo-white">{t(pack.descriptionKey)}</p>
            </div>
            <span
              aria-hidden="true"
              className={cn(
                'grid size-14 shrink-0 -rotate-3 place-items-center rounded-neo border-3 border-neo-black shadow-hard-sm @2xl:order-first',
                categoryTile[pack.category],
              )}
            >
              <Icon className="size-7 text-neo-black" />
            </span>
          </div>
        </div>
        <button type="button" onClick={onSelect} className={cn(actionClass, 'mt-auto bg-neo-cream @2xl:mt-0 @2xl:w-auto @2xl:shrink-0')}>
          <Plus className="size-4" aria-hidden />
          {t('education.starterPacks.useThisPack')}
        </button>
      </div>
    </article>
  );
}

export function packsForLanguage(language: string | undefined): readonly StarterLessonPack[] {
  const matching = STARTER_LESSON_PACKS.filter((pack) => pack.language === language);
  return matching.length > 0 ? matching : STARTER_LESSON_PACKS;
}

export const StarterPacksSection = memo<StarterPacksSectionProps>(({ onSelectPack, language, languages, classroomId, onRunSession }) => {
  const { t, language: uiLanguage } = useLanguage();
  const headingId = useId();
  const [picked, setPicked] = useState<Language | null>(null);
  const defaultLanguage = isPackLanguage(language) ? language : isPackLanguage(uiLanguage) ? uiLanguage : 'en';
  const contentLanguage = picked ?? defaultLanguage;
  const themedPacks = useThemedPacks(contentLanguage);
  const starterPacks = packsForLanguage(contentLanguage);

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
    <div className="@container space-y-8">
      <ContentLanguageChips
        testId="starter-packs-language"
        label={t('eduPickers.content.languageLabel', 'Language')}
        languages={contentLanguagesFor(defaultLanguage, languages ?? [])}
        value={contentLanguage}
        onChange={setPicked}
      />
      <SessionTemplatesSection
        language={contentLanguage}
        packs={themedPacks}
        classroomId={classroomId}
        onRunSession={onRunSession}
      />
      <ThemedPacksSection packs={themedPacks} onSelectPack={onSelectPack} />
      <section aria-labelledby={headingId} className="space-y-3">
        <div>
          <h3 id={headingId} className="text-xl font-neo-display font-black text-neo-white">
            {t('education.starterPacks.title')}
          </h3>
          <p className="text-sm text-neo-white font-neo-body">
            {t('education.starterPacks.subtitle')}
          </p>
        </div>
        <div className={starterGridClass(starterPacks.length)}>
          {starterPacks.map((pack) => (
            <PackCard
              key={pack.nameKey}
              pack={pack}
              onSelect={() => handleSelect(pack)}
            />
          ))}
        </div>
      </section>
    </div>
  );
});

StarterPacksSection.displayName = 'StarterPacksSection';
export default StarterPacksSection;
