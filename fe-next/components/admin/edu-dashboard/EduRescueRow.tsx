'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchWithAuth } from '@/utils/authFetch';
import { teacherDetailPath } from '@/components/admin/education/AdminTeacherDetail';
import type { RescueRow } from '@/lib/admin/eduDashboard';
import { isOutreachCoolingDown, teacherHomeUrl, type OutreachChannel } from '@/lib/admin/eduOutreach';
import { HealthChip, shortDate } from './eduDashboardShared';

type LogResult = 'ok' | 'cooldown' | 'unavailable' | 'error';

const BUTTON =
  'rounded border border-cyan-300/60 px-2 py-1 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/10 focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:opacity-40 disabled:hover:bg-transparent';

export function EduRescueRow({ index, row }: { index: number; row: RescueRow }) {
  const { t, language } = useLanguage();
  const [sentAt, setSentAt] = useState<string | null>(row.lastOutreachAt);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cooling = isOutreachCoolingDown(sentAt, Date.now());

  const link = teacherHomeUrl(typeof window === 'undefined' ? '' : window.location.origin, language);
  const name = row.name ?? t('admin.eduDashboard.rescue.nudge.there', 'there');
  const text = row.joinCode
    ? t('admin.eduDashboard.rescue.nudge.withCode', 'Hi {name}, your LexiClash class is ready. Students join with code {code} at {link}', {
        name,
        code: row.joinCode,
        link,
      })
    : t('admin.eduDashboard.rescue.nudge.noClass', 'Hi {name}, your LexiClash teacher account is approved. Create your first class at {link}, then share the join code with your students.', {
        name,
        link,
      });
  const subject = t('admin.eduDashboard.rescue.nudge.subject', 'Your first LexiClash game');
  const mailto = row.email
    ? `mailto:${row.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`
    : null;

  async function log(channel: OutreachChannel): Promise<LogResult> {
    setBusy(true);
    try {
      const res = await fetchWithAuth('/api/admin/edu-dashboard/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: row.id, channel }),
      });
      if (res.ok) {
        const json = (await res.json().catch(() => null)) as { createdAt?: string | null } | null;
        setSentAt(json?.createdAt ?? new Date().toISOString());
        return 'ok';
      }
      if (res.status === 409) {
        setNotice(t('admin.eduDashboard.rescue.cooldown', 'Already nudged in the last 7 days.'));
        return 'cooldown';
      }
      if (res.status === 503) return 'unavailable';
      setNotice(t('admin.eduDashboard.rescue.logFailed', 'Could not log this. Try again.'));
      return 'error';
    } catch {
      setNotice(t('admin.eduDashboard.rescue.logFailed', 'Could not log this. Try again.'));
      return 'error';
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    let copied = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      copied = false;
    }
    const result = await log('copy');
    if (!copied) setNotice(t('admin.eduDashboard.rescue.copyFailed', 'Could not copy. Select the text from the email instead.'));
    else if (result === 'unavailable') setNotice(t('admin.eduDashboard.rescue.copiedUnlogged', 'Copied. Logging is not set up yet.'));
    else if (result === 'ok') setNotice(t('admin.eduDashboard.rescue.copied', 'Copied.'));
  }

  async function markDone() {
    const result = await log('marked');
    if (result === 'ok') setNotice(t('admin.eduDashboard.rescue.marked', 'Marked as contacted.'));
    if (result === 'unavailable') setNotice(t('admin.eduDashboard.rescue.unavailable', 'Logging is not set up yet.'));
  }

  const disabled = cooling || busy;
  return (
    <li data-testid={`rescue-row-${row.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
      <span className="w-5 text-right tabular-nums text-white/50">{index + 1}</span>
      <Link
        href={teacherDetailPath(language, row.id)}
        className="min-w-0 flex-1 truncate font-semibold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-cyan-300"
      >
        {row.name ?? '—'}
      </Link>
      <HealthChip health={row.health} />
      <span className="text-xs tabular-nums text-white/60">{shortDate(row.lastActiveAt, language)}</span>
      {sentAt && cooling && (
        <span className="text-xs text-white/50">
          {t('admin.eduDashboard.rescue.nudged', 'Nudged {date}', { date: shortDate(sentAt, language) })}
        </span>
      )}
      <div className="flex w-full flex-wrap items-center gap-2 pl-8">
        <button type="button" className={BUTTON} disabled={disabled} onClick={copy}>
          {t('admin.eduDashboard.rescue.copy', 'Copy nudge')}
        </button>
        {mailto ? (
          <a
            href={mailto}
            className={`${BUTTON} ${disabled ? 'pointer-events-none opacity-40' : ''}`}
            aria-disabled={disabled}
            tabIndex={disabled ? -1 : undefined}
            onClick={() => {
              void log('email');
            }}
          >
            {t('admin.eduDashboard.rescue.email', 'Email')}
          </a>
        ) : null}
        <button type="button" className={BUTTON} disabled={disabled} onClick={markDone}>
          {t('admin.eduDashboard.rescue.mark', 'Mark done')}
        </button>
        {notice && (
          <span role="status" className="text-xs text-cyan-200">
            {notice}
          </span>
        )}
      </div>
    </li>
  );
}
