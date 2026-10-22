'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchWithAuth } from '@/utils/authFetch';
import { teacherDetailPath } from '@/components/admin/education/AdminTeacherDetail';
import type { TeacherRow } from '@/lib/admin/eduDashboard';
import type { AttentionItem } from '@/lib/admin/eduAttention';
import { isOutreachCoolingDown, teacherHomeUrl, type OutreachChannel } from '@/lib/admin/eduOutreach';
import { classDetailPath, HealthChip, MUTED, shortDate, teacherAccessPath } from './eduDashboardShared';

const REASON_FALLBACK: Record<AttentionItem['kind'], string> = {
  locked_out: 'Approved, but cannot sign in: the teacher role is missing.',
  trial_ending: 'Pro trial ends {date} and they are not paying yet.',
  no_students: 'Made a class, but no student has joined.',
  class_stalled: 'Has students, but no class game in 14 days:',
  no_class: 'Can sign in, but never made a class.',
  went_quiet: 'Visited this week, but ran no class game.',
};

type LogResult = 'ok' | 'cooldown' | 'unavailable' | 'error';

const BUTTON =
  'rounded border border-neo-cyan px-2 py-1 text-xs font-semibold text-neo-cyan hover:bg-neo-cyan/10 focus-visible:outline-2 focus-visible:outline-neo-cyan disabled:opacity-40 disabled:hover:bg-transparent';

export function EduAttentionRow({ index, row, item }: { index: number; row: TeacherRow; item: AttentionItem }) {
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
  const label = row.name ?? row.email ?? '—';
  return (
    <li data-testid={`rescue-row-${row.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm text-neo-cream">
      <span className={`w-5 text-end tabular-nums ${MUTED}`}>{index + 1}</span>
      <Link
        href={teacherDetailPath(language, row.id)}
        title={label}
        className="min-w-0 flex-1 truncate font-semibold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-neo-cyan"
      >
        {label}
      </Link>
      <HealthChip health={row.health} />
      <span className={`text-xs tabular-nums ${MUTED}`}>{shortDate(row.lastActiveAt, language)}</span>
      <p className="w-full ps-8 text-xs">
        {t(`admin.eduDashboard.attention.reason.${item.kind}`, REASON_FALLBACK[item.kind], {
          date: shortDate(item.dueAt, language),
        })}
        {item.classId && (
          <>
            {' '}
            <Link href={classDetailPath(language, item.classId)} className="font-semibold text-neo-cyan underline-offset-2 hover:underline">
              {item.className ?? t('admin.eduClass.unnamed', '(unnamed)')}
            </Link>
          </>
        )}
      </p>
      {sentAt && cooling && (
        <span className={`text-xs ${MUTED}`}>
          {t('admin.eduDashboard.rescue.nudged', 'Nudged {date}', { date: shortDate(sentAt, language) })}
        </span>
      )}
      {item.kind === 'locked_out' ? (
        <div className="flex w-full ps-8">
          <Link href={teacherAccessPath(language)} className={BUTTON}>
            {t('admin.eduDashboard.attention.fixAccess', 'Fix in Teacher access')}
          </Link>
        </div>
      ) : (
      <div className="flex w-full flex-wrap items-center gap-2 ps-8">
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
          <span role="status" className="text-xs text-neo-cyan">
            {notice}
          </span>
        )}
      </div>
      )}
    </li>
  );
}
