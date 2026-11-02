'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, TriangleAlert } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import { fetchWithAuth } from '@/utils/authFetch';
import logger from '@/utils/logger';
import { pluralKey } from '@/lib/i18n/pluralKey';
import { resolveProOffer, type ProOfferState } from '@/lib/education/pro/proOfferCopy';
import { resultsTrialCopy } from '@/lib/education/pro/trialCtaCopy';
import { ProOfferCompactLink } from '@/components/education/results/ProOfferCompactLink';

const ENDED_CODE_TRIES = { one: 'academy.hq.endedCodeTriesOne', other: 'academy.hq.endedCodeTries' };

/** `source` on the Teacher Pro server twins for the late-join note. */
export const LATE_JOIN_PRO_PLACEMENT = 'late_join_notice' as const;

/** What the dashboard already knows about the teacher's Teacher Pro, so this note reads no status of its own. */
export interface LateJoinProState extends ProOfferState {
  hasPro: boolean;
  loading: boolean;
}

/**
 * "N students tried to join after your game ended" on the teacher's HQ. Counts
 * both the REST join and the live-socket refusals (lib/education/endedCodeTries).
 * A free teacher also gets one soft Teacher Pro line: assignments students can
 * play on their own time. Its button label comes from resolveProOffer, so the
 * single-trial rules hold: inside the free access trial -> keep Pro after it;
 * access trial ended -> straight $9/mo; never trialed -> the 14-day trial.
 * In-app only; nothing here sends email.
 */
export function EndedCodeTriesNotice({ classroomId, pro }: { classroomId: string; pro?: LateJoinProState }) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    setCount(0);
    fetchWithAuth(`/api/education/classroom/${classroomId}/ended-code-tries`)
      .then((res) => {
        if (res.ok) return res.json();
        logger.warn(`ended-code-tries read failed: ${res.status}`);
        return null;
      })
      .then((body: { count?: number } | null) => {
        if (alive) setCount(typeof body?.count === 'number' ? body.count : 0);
      })
      .catch((err) => logger.warn('ended-code-tries read threw:', err));
    return () => {
      alive = false;
    };
  }, [classroomId]);

  if (count < 1) return null;

  const showPro = !!pro && !pro.loading && pro.known && !pro.hasPro;
  const offer = showPro ? resolveProOffer(language, pro, resultsTrialCopy(language)) : null;

  return (
    <div
      data-testid="hq-ended-code-tries"
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-neo border-[3px] border-neo-black bg-neo-yellow px-3 py-2 text-neo-black shadow-hard-sm"
    >
      <TriangleAlert className="size-5 shrink-0" strokeWidth={2.5} aria-hidden />
      <p data-testid="hq-ended-code-tries-text" className="min-w-48 flex-1 font-neo-display text-sm font-black">
        {t(pluralKey(ENDED_CODE_TRIES, count, language), { count })}
      </p>
      <Link
        href={teacherHostHref(language, { classroomId })}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-neo border-2 border-neo-black bg-neo-lime px-3 font-neo-display text-sm font-black shadow-hard-sm active:translate-y-0.5"
      >
        <Play className="size-4" strokeWidth={3} aria-hidden />
        {t('academy.hq.startTitle')}
      </Link>
      {offer ? (
        <div data-testid="hq-late-join-pro" data-offer={offer.offer} className="flex w-full flex-wrap items-center gap-x-2 border-t-2 border-neo-black/15 pt-1.5">
          <p className="font-neo-body text-xs font-bold">{t('academy.hq.lateJoinProLine')}</p>
          <ProOfferCompactLink
            label={offer.label}
            placement={LATE_JOIN_PRO_PLACEMENT}
            language={language}
            cta={offer.cta}
            offer={offer.offer}
            userId={user?.id ?? null}
            href={`/${language}/teacher/upgrade?source=${LATE_JOIN_PRO_PLACEMENT}`}
            className="text-neo-black hover:text-neo-navy"
          />
          <p data-testid="hq-late-join-pro-note" className="font-neo-body text-xs text-neo-black/70">{offer.note}</p>
        </div>
      ) : null}
    </div>
  );
}
