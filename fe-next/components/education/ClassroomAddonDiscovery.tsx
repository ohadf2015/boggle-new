/**
 * Google Classroom Marketplace — Attachment Discovery iframe.
 *
 * Teacher enters class-level missed words; one-click posts Unplugged reteach
 * homework (#968 printable + Live deep-link) to the Classroom Stream via the
 * Phase-1 share dialog (no OAuth / no roster PII). Foils Discovery Education
 * Gemini Classroom + Kahootopia Assignments.
 */

'use client';

import { useMemo, useState } from 'react';
import { GraduationCap, Printer, Share2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  buildClassroomAddonAssign,
  type ClassroomAddonContextQuery,
} from '@/lib/education/googleClassroomAddon';
import { openMissedWordsPracticeSheet } from '@/lib/education/missedWordsPracticeSheet';

export interface ClassroomAddonDiscoveryProps {
  locale: string;
  initialMissedWords?: string[];
  initialLesson?: string;
  context?: ClassroomAddonContextQuery;
}

export function ClassroomAddonDiscovery({
  locale,
  initialMissedWords = [],
  initialLesson = '',
  context,
}: ClassroomAddonDiscoveryProps) {
  const { t } = useLanguage();
  const [lesson, setLesson] = useState(initialLesson);
  const [missedText, setMissedText] = useState(initialMissedWords.join(', '));

  const assign = useMemo(() => {
    return buildClassroomAddonAssign({
      missed_words: missedText,
      lesson: lesson || undefined,
      locale,
    });
  }, [missedText, lesson, locale]);

  const streamHref = assign.ok ? assign.streamAssignUrl : null;
  const unpluggedHref = assign.ok ? assign.unpluggedUrl : null;
  const words = assign.ok ? assign.attachment.title : '';

  const handlePrint = () => {
    if (!assign.ok) return;
    const missed = missedText
      .split(/[,;\n]+/)
      .map((w) => w.trim())
      .filter(Boolean);
    openMissedWordsPracticeSheet({
      lesson: lesson.trim() || 'Unplugged reteach',
      missedWords: missed,
      locale,
      labels: {
        title: t('education.results.printPracticeSheetTitle', { lesson: lesson || 'Lesson' }),
        subtitle: t('education.results.printPracticeSheetSubtitle'),
        writeLabel: t('education.results.printPracticeSheetWriteLabel'),
        sentenceLabel: t('education.results.printPracticeSheetSentenceLabel'),
        nameLine: t('education.results.printPracticeSheetNameLine'),
        dateLine: t('education.results.printPracticeSheetDateLine'),
        footer: t('education.results.printPracticeSheetFooter'),
      },
    });
  };

  const inClassroom = Boolean(context?.courseId || context?.addOnToken);

  return (
    <div
      className="w-full max-w-xl p-6 rounded-neo border-neo border-neo-black bg-neo-navy-light shadow-hard"
      data-testid="classroom-addon-discovery"
      data-in-classroom={String(inClassroom)}
    >
      <p className="text-neo-pink font-bold text-xs uppercase tracking-widest mb-2">
        {t('education.classroomAddon.eyebrow')}
      </p>
      <h1 className="text-neo-white font-neo-display font-bold text-2xl leading-tight flex items-center gap-2">
        <GraduationCap className="w-6 h-6 text-neo-lime shrink-0" aria-hidden />
        {t('education.classroomAddon.title')}
      </h1>
      <p className="text-neo-white/70 font-neo-body text-sm mt-2">
        {t('education.classroomAddon.subtitle')}
      </p>

      <label className="block mt-5">
        <span className="text-neo-white font-bold text-sm">
          {t('education.classroomAddon.lessonLabel')}
        </span>
        <input
          type="text"
          value={lesson}
          onChange={(e) => setLesson(e.target.value)}
          data-testid="classroom-addon-lesson"
          className="mt-1 w-full px-3 py-2 rounded-neo border-neo border-neo-black bg-neo-navy text-neo-white font-neo-body text-sm"
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
          data-testid="classroom-addon-missed-words"
          rows={3}
          className="mt-1 w-full px-3 py-2 rounded-neo border-neo border-neo-black bg-neo-navy text-neo-white font-neo-body text-sm"
        />
      </label>

      <p className="text-neo-white/50 font-neo-body text-xs mt-2">
        {t('education.classroomAddon.privacyNote')}
      </p>

      {streamHref ? (
        <a
          href={streamHref}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="classroom-addon-post-stream"
          className={cn(
            'mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm',
            'bg-neo-lime text-neo-black border-neo border-neo-black rounded-neo',
            'shadow-hard hover:shadow-hard-lg transition-all',
          )}
        >
          <Share2 className="w-4 h-4" aria-hidden />
          {t('education.classroomAddon.postToStream')}
        </a>
      ) : (
        <p
          data-testid="classroom-addon-need-words"
          className="mt-5 p-3 rounded-neo border border-neo-pink/40 bg-neo-pink/10 text-neo-white font-neo-body text-sm"
        >
          {t('education.classroomAddon.needMissedWords')}
        </p>
      )}

      {unpluggedHref && (
        <a
          href={unpluggedHref}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="classroom-addon-open-unplugged"
          className={cn(
            'mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-sm',
            'bg-neo-cyan text-neo-black border-neo border-neo-black rounded-neo',
            'shadow-hard-sm hover:shadow-hard transition-all',
          )}
        >
          {t('education.classroomAddon.openUnplugged')}
        </a>
      )}

      {assign.ok && (
        <button
          type="button"
          data-testid="classroom-addon-print-sheet"
          onClick={handlePrint}
          className={cn(
            'mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-sm',
            'bg-neo-white text-neo-black border-neo border-neo-black rounded-neo',
            'shadow-hard-sm hover:shadow-hard transition-all',
          )}
        >
          <Printer className="w-4 h-4" aria-hidden />
          {t('education.results.printPracticeSheet')}
        </button>
      )}

      {/* Keep attachment title out of visual tree noise but available for tests */}
      <span className="sr-only" data-testid="classroom-addon-attachment-title">
        {words}
      </span>
    </div>
  );
}
