/**
 * One-click "schedule reteach Live in ~14 days" for miss-gap words.
 *
 * Sits under the last-lesson digest missed-word chips (#1090). Parks the
 * words in localStorage, opens a Google Calendar invite (ICS download as
 * fallback), and fires edu telemetry — Kahoot Teacher Takeover foil.
 */

'use client';

import { useCallback, useState } from 'react';
import { CalendarPlus, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  RETEACH_LIVE_DELAY_DAYS,
  SCHEDULED_RETEACH_STORAGE_KEY,
  buildScheduledReteachLive,
  upsertScheduledReteach,
} from '@/lib/education/scheduleReteachLive';
import { trackEduReteachLiveScheduled } from '@/lib/education/telemetry';

export interface ScheduleReteachLiveButtonProps {
  classroomId: string;
  classroomName: string;
  missedWords: string[];
  lessonName?: string;
}

function downloadIcs(content: string, filename: string): void {
  try {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    // Download blocked — calendar tab is still enough.
  }
}

export function ScheduleReteachLiveButton({
  classroomId,
  classroomName,
  missedWords,
  lessonName,
}: ScheduleReteachLiveButtonProps) {
  const { t, language } = useLanguage();
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);

  const handleSchedule = useCallback(() => {
    const record = buildScheduledReteachLive({
      classroomId,
      classroomName,
      locale: language,
      missedWords,
      lessonName,
    });
    if (!record) return;

    try {
      const prev = window.localStorage.getItem(SCHEDULED_RETEACH_STORAGE_KEY);
      window.localStorage.setItem(
        SCHEDULED_RETEACH_STORAGE_KEY,
        upsertScheduledReteach(prev, record),
      );
    } catch {
      // Storage blocked — still open the calendar invite.
    }

    trackEduReteachLiveScheduled({
      wordCount: record.missedWords.length,
      delayDays: record.delayDays,
    });

    try {
      window.open(record.googleCalendarUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // Popup blocked — fall through to ICS.
    }
    downloadIcs(record.icsContent, record.icsFilename);
    setScheduledAt(record.scheduledAt);
  }, [classroomId, classroomName, language, missedWords, lessonName]);

  if (missedWords.length === 0) return null;

  if (scheduledAt) {
    const when = new Date(scheduledAt);
    const dateLabel = Number.isNaN(when.getTime())
      ? scheduledAt
      : when.toLocaleDateString(language, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
    return (
      <p
        data-testid="schedule-reteach-live-confirm"
        role="status"
        className="flex items-center gap-2 rounded-neo border-2 border-neo-lime bg-neo-lime/15 px-4 py-3 text-sm font-bold text-neo-white"
      >
        <Check className="size-4 shrink-0 text-neo-lime" aria-hidden="true" />
        {t('teacher.digest.scheduleReteachConfirm', {
          date: dateLabel,
          days: String(RETEACH_LIVE_DELAY_DAYS),
        })}
      </p>
    );
  }

  return (
    <button
      type="button"
      data-testid="schedule-reteach-live-button"
      onClick={handleSchedule}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-neo border-2 border-black bg-neo-yellow px-4 font-neo-display text-sm font-black text-black shadow-hard transition-shadow hover:shadow-hard-lg sm:w-auto"
    >
      <CalendarPlus className="size-4 shrink-0" aria-hidden="true" />
      {t('teacher.digest.scheduleReteachCta', { days: String(RETEACH_LIVE_DELAY_DAYS) })}
    </button>
  );
}

export default ScheduleReteachLiveButton;
