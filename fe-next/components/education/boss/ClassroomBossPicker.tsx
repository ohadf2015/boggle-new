'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Lock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { CLASSROOM_BOSS_IDS, FREE_CLASSROOM_BOSS_ID, type ClassroomBossId } from '@/shared/types/classroomBoss';
import { bossImage, bossNameKey } from './bossArt';

interface ClassroomBossPickerProps {
  value: ClassroomBossId;
  onChange: (id: ClassroomBossId) => void;
}

/** Teacher-only boss choice: free fights the Lexicon Dragon, Pro picks any of the ten. Locks are badges, never popups. */
export function ClassroomBossPicker({ value, onChange }: ClassroomBossPickerProps) {
  const { t, language } = useLanguage();
  const { hasPro, loading } = useTeacherPro();
  // Unresolved entitlement renders locked: never paint unlocked and then yank it (pitfall class 1).
  const unlocked = hasPro && !loading;
  const shown = unlocked || value === FREE_CLASSROOM_BOSS_ID ? value : FREE_CLASSROOM_BOSS_ID;
  const freeTeacher = !loading && !hasPro;
  useEffect(() => {
    if (freeTeacher && value !== FREE_CLASSROOM_BOSS_ID) onChange(FREE_CLASSROOM_BOSS_ID);
  }, [freeTeacher, value, onChange]);

  return (
    <section data-testid="boss-picker" className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-neo-display text-sm font-bold text-neo-cream">{t('classroomBoss.picker.title')}</h3>
        {!loading && !hasPro && (
          <Link
            href={`/${language}/teacher/upgrade`}
            data-testid="boss-picker-pro"
            className="inline-flex min-h-8 items-center gap-1.5 rounded-neo border-2 border-neo-cream/35 bg-transparent px-2.5 py-0.5 font-neo-display text-xs font-bold text-neo-cream transition-colors hover:border-neo-cream/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neo-cream"
          >
            <Lock className="size-3" strokeWidth={3} aria-hidden="true" />
            {t('classroomBoss.picker.unlock')}
          </Link>
        )}
      </div>
      <div role="radiogroup" aria-label={t('classroomBoss.picker.title')} className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
        {CLASSROOM_BOSS_IDS.map((id) => {
          const locked = !unlocked && id !== FREE_CLASSROOM_BOSS_ID;
          const selected = id === shown;
          const name = t(bossNameKey(id));
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={locked}
              aria-label={locked ? t('classroomBoss.picker.lockedName', { name }) : name}
              data-testid={`boss-option-${id}`}
              onClick={() => !locked && onChange(id)}
              className={cn(
                'relative w-[76px] shrink-0 snap-start rounded-neo border-[3px] bg-neo-navy-light p-1 text-center transition-[transform,box-shadow] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neo-lime',
                selected ? 'border-neo-lime' : 'border-neo-cream/35 hover:border-neo-cream/60',
                locked ? 'cursor-not-allowed' : 'active:scale-[0.97]',
              )}
            >
              <span className="relative block aspect-square overflow-hidden rounded-[8px] bg-neo-purple-dark">
                <Image src={bossImage(id)} alt="" fill sizes="72px" className={cn('object-cover object-top', locked && 'opacity-45 grayscale')} />
                {locked && (
                  <span className="absolute end-1 top-1 grid size-5 place-items-center rounded-full border-2 border-neo-cream/35 bg-neo-navy-light" aria-hidden="true">
                    <Lock className="size-2.5 text-neo-cream" strokeWidth={3} />
                  </span>
                )}
                {selected && (
                  <span className="absolute end-1 top-1 grid size-5 place-items-center rounded-full border-2 border-neo-lime bg-neo-navy-light" aria-hidden="true">
                    <Check className="size-3 text-neo-cream" strokeWidth={4} />
                  </span>
                )}
              </span>
              <span dir="auto" className={cn('mt-1 block truncate text-[10px] font-bold leading-tight', locked ? 'text-neo-white/50' : 'text-neo-white')}>
                {name}
              </span>
            </button>
          );
        })}
      </div>
      {!loading && (
        <p data-testid="boss-picker-hint" className="text-xs font-bold text-neo-white/60">
          {t(hasPro ? 'classroomBoss.picker.proHint' : 'classroomBoss.picker.freeHint')}
        </p>
      )}
    </section>
  );
}
