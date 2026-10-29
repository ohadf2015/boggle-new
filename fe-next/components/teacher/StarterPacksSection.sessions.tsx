'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { Language } from '@/lib/supabase/education/types';
import { launchOf } from '@/lib/education/classroomCatalogueId';
import { teacherGameMode } from '@/lib/education/gameModes';
import {
  sessionHostHref,
  sessionMinutes,
  sessionPackThemes,
  sessionsFor,
  type SessionTemplate,
} from '@/lib/education/sessionTemplates';
import { packLessonInput, themedPackCode, type PackLessonInput, type PackTheme, type ThemedPack } from '@/lib/education/themedPacks';
import { CardArt, actionClass, chipClass, gradeBandsLabel } from './StarterPacksSection.data';

export interface SessionRun {
  session: SessionTemplate;
  packCode: string | null;
  pack: PackLessonInput | null;
  href: string;
}

interface SessionsProps {
  language: Language;
  packs: ThemedPack[] | null;
  classroomId?: string;
  onRunSession?: (run: SessionRun) => void;
}

function choiceLabel(theme: PackTheme, pack: ThemedPack | undefined): string {
  return theme.startsWith('esl-') ? theme.slice(4).toUpperCase() : pack?.name ?? theme;
}

function SessionCard({ session, language, packs, classroomId, onRunSession }: SessionsProps & { session: SessionTemplate }) {
  const { t, language: locale } = useLanguage();
  const themes = sessionPackThemes(session, language);
  const [choice, setChoice] = useState(0);
  const theme = themes[choice] ?? null;
  const packCode = theme ? themedPackCode(language, theme) : null;
  const pack = packCode ? packs?.find((p) => p.code === packCode) : undefined;
  const href = sessionHostHref(locale, session, packCode, classroomId);
  const modeKey = teacherGameMode(launchOf(session.mode).gameMode)?.nameKey;
  const runLabel = (
    <>
      <Play className="size-4" aria-hidden />
      {t('education.starterPacks.sessions.runThis')}
    </>
  );

  return (
    <article className="flex flex-col gap-3 rounded-neo border-3 border-neo-cream bg-neo-navy/80 p-4 shadow-hard">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn(chipClass, 'bg-neo-lime')}>{t('education.modePicker.minutes', { count: sessionMinutes(session) })}</span>
        <span className={cn(chipClass, 'bg-neo-cyan')}>{gradeBandsLabel(session.gradeBands, t)}</span>
        {modeKey && <span className={cn(chipClass, 'bg-neo-cream')}>{t(modeKey)}</span>}
      </div>
      <div className="flex flex-1 items-start gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="font-neo-display text-lg font-black text-neo-white">{t(session.nameKey)}</h4>
          <p className="mt-1 font-neo-body text-sm leading-relaxed text-neo-white">{t(session.whenKey)}</p>
        </div>
        <CardArt pose={session.mascot} />
      </div>
      {themes.length > 1 ? (
        <div role="radiogroup" aria-label={t('education.starterPacks.sessions.pickList')} className="flex flex-wrap gap-1.5">
          {themes.map((th, i) => {
            const label = choiceLabel(th, packs?.find((p) => p.theme === th));
            return (
              <button
                key={th}
                type="button"
                role="radio"
                aria-checked={i === choice}
                aria-label={label}
                onClick={() => setChoice(i)}
                className={cn(
                  'min-h-11 min-w-11 rounded-neo border-2 px-3 font-neo-body text-sm font-black',
                  i === choice ? 'border-neo-black bg-neo-lime text-neo-black' : 'border-neo-cream/60 text-neo-white',
                )}
              >
                <span dir="auto">{label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="font-neo-body text-xs font-bold uppercase text-neo-white/80" dir="auto">
          {theme ? pack?.name ?? ' ' : t('education.starterPacks.sessions.noList')}
        </p>
      )}
      {onRunSession ? (
        <button
          type="button"
          disabled={!!packCode && !pack}
          onClick={() => onRunSession({ session, packCode, pack: pack ? packLessonInput(pack) : null, href })}
          className={cn(actionClass, 'bg-neo-lime')}
        >
          {runLabel}
        </button>
      ) : (
        <Link href={href} className={cn(actionClass, 'bg-neo-lime')}>
          {runLabel}
        </Link>
      )}
    </article>
  );
}

export function SessionTemplatesSection(props: SessionsProps) {
  const { t } = useLanguage();
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div>
        <h3 id={headingId} className="font-neo-display text-xl font-black text-neo-white">
          {t('education.starterPacks.sessions.title')}
        </h3>
        <p className="font-neo-body text-sm text-neo-white">{t('education.starterPacks.sessions.subtitle')}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 @xl:grid-cols-2 @5xl:grid-cols-4">
        {sessionsFor(props.language).map((session) => (
          <SessionCard key={session.id} session={session} {...props} />
        ))}
      </div>
    </section>
  );
}
