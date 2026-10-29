'use client';

import { useId, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { packLessonInput, seasonThemeFor, type PackLessonInput, type ThemedPack } from '@/lib/education/themedPacks';
import { CardArt, actionClass, chipClass } from './StarterPacksSection.data';

const VISIBLE = 6;

interface ThemedProps {
  packs: ThemedPack[] | null;
  onSelectPack: (pack: PackLessonInput) => void;
}

function ThemedPackCard({ pack, isSeason, onSelect }: { pack: ThemedPack; isSeason: boolean; onSelect: () => void }) {
  const { t } = useLanguage();
  return (
    <article className="flex flex-col gap-3 rounded-neo border-3 border-neo-cream bg-neo-navy/80 p-4 shadow-hard">
      <div className="flex flex-wrap items-center gap-1.5">
        {isSeason && <span className={cn(chipClass, 'bg-neo-lime')}>{t('education.starterPacks.themed.thisSeason')}</span>}
        <span className={cn(chipClass, 'bg-neo-cyan')}>{t(`eduLibrary.grade.${pack.gradeBand}`)}</span>
        <span className={cn(chipClass, 'bg-neo-cream')}>{t('teacher.lesson.words', { count: pack.words.length })}</span>
      </div>
      <div className="flex flex-1 items-start gap-3">
        <div className="min-w-0 flex-1" lang={pack.language} dir="auto">
          <h4 className="font-neo-display text-lg font-black text-neo-white">{pack.name}</h4>
          <p className="mt-1 line-clamp-2 font-neo-body text-sm leading-relaxed text-neo-white">{pack.description}</p>
        </div>
        <CardArt pose={pack.mascot} />
      </div>
      <button type="button" onClick={onSelect} className={cn(actionClass, 'bg-neo-cream')}>
        <Plus className="size-4" aria-hidden />
        {t('education.starterPacks.themed.addToLessons')}
      </button>
    </article>
  );
}

export function ThemedPacksSection({ packs, onSelectPack }: ThemedProps) {
  const { t } = useLanguage();
  const headingId = useId();
  const [showAll, setShowAll] = useState(false);
  const season = seasonThemeFor(new Date());
  const ordered = useMemo(
    () => (packs ? [...packs.filter((p) => p.theme === season), ...packs.filter((p) => p.theme !== season)] : []),
    [packs, season],
  );
  const visible = showAll ? ordered : ordered.slice(0, VISIBLE);

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div>
        <h3 id={headingId} className="font-neo-display text-xl font-black text-neo-white">
          {t('education.starterPacks.themed.title')}
        </h3>
        <p className="font-neo-body text-sm text-neo-white">{t('education.starterPacks.themed.subtitle')}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 @xl:grid-cols-2 @5xl:grid-cols-3">
        {visible.map((pack) => (
          <ThemedPackCard
            key={pack.code}
            pack={pack}
            isSeason={pack.theme === season}
            onSelect={() => onSelectPack(packLessonInput(pack))}
          />
        ))}
      </div>
      {ordered.length > VISIBLE && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="min-h-11 rounded-neo border-2 border-neo-cream px-4 font-neo-body text-sm font-black text-neo-white hover:bg-neo-cream/10 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan"
        >
          {showAll
            ? t('education.starterPacks.themed.showLess')
            : t('education.starterPacks.themed.showAll', { count: ordered.length })}
        </button>
      )}
    </section>
  );
}
