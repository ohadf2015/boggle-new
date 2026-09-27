/**
 * Conversational Google Classroom add-on planner UI.
 *
 * Teacher types plain language; we route into Classic / Team Unplugged or
 * reteach Live + grade passback. Foils Discovery Education Gemini
 * conversational Classroom. Does not reopen Unplugged game logic.
 */

'use client';

import { useMemo, useState } from 'react';
import {
  GraduationCap,
  MessageSquareText,
  MonitorPlay,
  Share2,
  ClipboardCheck,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  buildClassroomAddonPlan,
  type ClassroomAddonPlanMode,
} from '@/lib/education/classroomAddonPlanner';
import type { ClassroomAddonContextQuery } from '@/lib/education/googleClassroomAddon';
import { NeoNote } from '@/components/ui/note';

export interface ClassroomAddonPlannerProps {
  locale: string;
  initialPrompt?: string;
  initialMissedWords?: string[];
  initialLesson?: string;
  context?: ClassroomAddonContextQuery;
}

const EXAMPLE_PROMPTS = [
  "Unplugged reteach on yesterday's misses",
  '3-min Live on CEFR gaps',
  'Classic Unplugged with the class',
  'Team Tiles for two groups',
] as const;

function modeLabelKey(mode: ClassroomAddonPlanMode): string {
  switch (mode) {
    case 'classic_unplugged':
      return 'education.classroomAddon.planner.modeClassic';
    case 'team_tiles_unplugged':
      return 'education.classroomAddon.planner.modeTeam';
    case 'reteach_live_3min':
      return 'education.classroomAddon.planner.modeLive3min';
    case 'unplugged_reteach':
    default:
      return 'education.classroomAddon.planner.modeReteach';
  }
}

export function ClassroomAddonPlanner({
  locale,
  initialPrompt = '',
  initialMissedWords = [],
  initialLesson = '',
  context,
}: ClassroomAddonPlannerProps) {
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState(initialPrompt);
  const [lesson, setLesson] = useState(initialLesson);
  const [missedText, setMissedText] = useState(initialMissedWords.join(', '));

  const plan = useMemo(() => {
    return buildClassroomAddonPlan({
      prompt,
      missed_words: missedText,
      lesson: lesson || undefined,
      locale,
      context,
    });
  }, [prompt, missedText, lesson, locale, context]);

  const inClassroom = Boolean(context?.courseId || context?.addOnToken);

  return (
    <div
      className="w-full max-w-xl p-6 rounded-neo border-neo border-neo-cream/40 bg-neo-navy-light shadow-hard"
      data-testid="classroom-addon-planner"
      data-in-classroom={String(inClassroom)}
      data-mode={plan.ok ? plan.mode : 'none'}
    >
      <p className="text-neo-pink font-bold text-xs uppercase tracking-widest mb-2">
        {t('education.classroomAddon.planner.eyebrow')}
      </p>
      <h1 className="text-neo-white font-neo-display font-bold text-2xl leading-tight flex items-center gap-2">
        <MessageSquareText className="w-6 h-6 text-neo-lime shrink-0" aria-hidden />
        {t('education.classroomAddon.planner.title')}
      </h1>
      <p className="text-neo-white/70 font-neo-body text-sm mt-2">
        {t('education.classroomAddon.planner.subtitle')}
      </p>

      <label className="block mt-5">
        <span className="text-neo-white font-bold text-sm">
          {t('education.classroomAddon.planner.promptLabel')}
        </span>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          data-testid="classroom-addon-planner-prompt"
          rows={2}
          placeholder={t('education.classroomAddon.planner.promptPlaceholder')}
          className="mt-1 w-full px-3 py-2 rounded-neo border-neo border-neo-cream/40 bg-neo-navy text-neo-white font-neo-body text-sm placeholder:text-neo-white/40"
        />
      </label>

      <div className="mt-2 flex flex-wrap gap-2" data-testid="classroom-addon-planner-examples">
        {EXAMPLE_PROMPTS.map((example) => (
          <button
            key={example}
            type="button"
            data-testid={`classroom-addon-planner-example-${example.slice(0, 12).replace(/\s+/g, '-')}`}
            onClick={() => setPrompt(example)}
            className="px-2.5 py-1 text-xs font-bold rounded-neo border-neo border-neo-cream/40 bg-neo-navy text-neo-cream/90 hover:border-neo-lime hover:text-neo-lime transition-colors"
          >
            {example}
          </button>
        ))}
      </div>

      <label className="block mt-4">
        <span className="text-neo-white font-bold text-sm">
          {t('education.classroomAddon.lessonLabel')}
        </span>
        <input
          type="text"
          value={lesson}
          onChange={(e) => setLesson(e.target.value)}
          data-testid="classroom-addon-planner-lesson"
          className="mt-1 w-full px-3 py-2 rounded-neo border-neo border-neo-cream/40 bg-neo-navy text-neo-white font-neo-body text-sm"
          autoComplete="off"
        />
      </label>

      <label className="block mt-4">
        <span className="text-neo-white font-bold text-sm">
          {t('education.classroomAddon.missedWordsLabel')}
        </span>
        <textarea
          value={missedText}
          onChange={(e) => setMissedText(e.target.value)}
          data-testid="classroom-addon-planner-missed-words"
          rows={2}
          className="mt-1 w-full px-3 py-2 rounded-neo border-neo border-neo-cream/40 bg-neo-navy text-neo-white font-neo-body text-sm"
        />
      </label>

      <p className="text-neo-white/50 font-neo-body text-xs mt-2">
        {t('education.classroomAddon.planner.privacyNote')}
      </p>

      {plan.ok ? (
        <>
          <NeoNote
            tone="info"
            data-testid="classroom-addon-planner-mode"
            className="mt-4 text-neo-white font-neo-body text-sm"
          >
            <span className="font-bold">{t(modeLabelKey(plan.mode))}</span>
            {plan.timer_seconds ? (
              <span className="ms-2 opacity-80">
                {t('education.classroomAddon.planner.timerNote', {
                  seconds: plan.timer_seconds,
                })}
              </span>
            ) : null}
            {plan.cefr_level ? (
              <span className="ms-2 opacity-80">
                {t('education.classroomAddon.planner.cefrNote', {
                  level: plan.cefr_level,
                })}
              </span>
            ) : null}
          </NeoNote>

          <a
            href={plan.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="classroom-addon-planner-open-live"
            className={cn(
              'mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm',
              'bg-neo-lime text-neo-black border-neo border-neo-black rounded-neo',
              'shadow-hard hover:shadow-hard-lg transition-all',
            )}
          >
            <MonitorPlay className="w-4 h-4" aria-hidden />
            {t('education.classroomAddon.planner.openLive')}
          </a>

          <a
            href={plan.gradePassbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="classroom-addon-planner-grade-passback"
            className={cn(
              'mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-sm',
              'bg-neo-cyan text-neo-black border-neo border-neo-black rounded-neo',
              'shadow-hard-sm hover:shadow-hard transition-all',
            )}
          >
            <ClipboardCheck className="w-4 h-4" aria-hidden />
            {t('education.classroomAddon.planner.openGradePassback')}
          </a>

          {plan.streamAssignUrl ? (
            <a
              href={plan.streamAssignUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="classroom-addon-planner-post-stream"
              className={cn(
                'mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-sm',
                'bg-neo-cream text-neo-black border-neo border-neo-black rounded-neo',
                'shadow-hard-sm hover:shadow-hard transition-all',
              )}
            >
              <Share2 className="w-4 h-4" aria-hidden />
              {t('education.classroomAddon.planner.postToStream')}
            </a>
          ) : null}

          <p className="text-neo-white/45 font-neo-body text-xs mt-3 flex items-start gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 mt-0.5 shrink-0 text-neo-pink" aria-hidden />
            {t('education.classroomAddon.planner.foilNote')}
          </p>
        </>
      ) : (
        <NeoNote
          tone="alert"
          data-testid="classroom-addon-planner-need-input"
          className="mt-5 text-neo-white font-neo-body text-sm"
        >
          {prompt.trim()
            ? t('education.classroomAddon.planner.needMissedWords')
            : t('education.classroomAddon.planner.needPrompt')}
        </NeoNote>
      )}
    </div>
  );
}
