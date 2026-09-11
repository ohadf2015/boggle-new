/**
 * Parent / WhatsApp miss-gap practice card — after #975/#977 passback.
 *
 * Public surface parents open from wa.me. Class-level missed words + due;
 * never student names. Foil: Classroom grade sync stops at the gradebook —
 * LexiClash sends the practice card home on WhatsApp.
 */
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ClipboardList, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { WhatsAppIcon } from '@/components/icons/SocialIcons';
import {
  buildMissGapAssignmentPath,
  type MissGapAssignmentPayload,
} from '@/lib/education/missGapAsyncAssignment';
import { buildMissGapPracticePath } from '@/lib/education/missGapPracticeShare';
import {
  buildMissGapWhatsAppDeepLink,
  canShareMissGapWhatsApp,
} from '@/lib/education/missGapWhatsAppShare';

export interface MissGapWhatsAppShareCardProps {
  payload: MissGapAssignmentPayload;
  /**
   * When true (share destination / public page), hide the "open WhatsApp"
   * composer and emphasize practice CTAs. Default: false (teacher/student
   * share composer after grade passback).
   */
  parentView?: boolean;
}

export function MissGapWhatsAppShareCard({
  payload,
  parentView = false,
}: MissGapWhatsAppShareCardProps) {
  const { t, language } = useLanguage();
  const [opened, setOpened] = useState(false);

  const locale = payload.locale || language;
  const words = payload.missedWords;
  const lesson = payload.lesson || t('education.results.title');
  const canShare = canShareMissGapWhatsApp(payload);

  const practiceHref = useMemo(
    () => buildMissGapPracticePath(payload),
    [payload],
  );
  const homeworkHref = useMemo(
    () => buildMissGapAssignmentPath(payload),
    [payload],
  );

  const whatsappHref = useMemo(() => {
    if (!canShare) return null;
    const text = t('education.results.missGapWhatsAppShareText', {
      lesson,
      missed: words.join(', '),
      due: payload.dueDate || '—',
    });
    return buildMissGapWhatsAppDeepLink({ text, input: payload });
  }, [canShare, t, lesson, words, payload]);

  const handleWhatsApp = () => {
    if (!whatsappHref) return;
    window.open(whatsappHref, '_blank', 'noopener,noreferrer');
    setOpened(true);
  };

  if (words.length === 0) {
    return (
      <div
        data-testid="miss-gap-whatsapp-share-card"
        className="w-full max-w-xl p-6 rounded-neo border-neo border-neo-black bg-neo-navy-light shadow-hard text-center"
      >
        <p className="text-neo-white font-neo-body mb-4">{t('education.results.allFound')}</p>
        <Link
          href={`/${locale}/education`}
          className="inline-flex items-center justify-center px-4 py-3 font-bold bg-neo-lime text-neo-black border-neo border-neo-black rounded-neo shadow-hard"
        >
          {t('education.results.shareGapCta')}
        </Link>
      </div>
    );
  }

  return (
    <article
      data-testid="miss-gap-whatsapp-share-card"
      className="w-full max-w-xl p-6 rounded-neo border-neo border-neo-black bg-neo-navy-light shadow-hard"
    >
      <p className="text-neo-pink font-bold text-xs uppercase tracking-widest mb-2">
        {t('education.results.missGapWhatsAppEyebrow')}
      </p>
      <h1 className="text-neo-white font-neo-display font-bold text-2xl leading-tight">
        {t('education.results.missGapWhatsAppHeading')}
      </h1>
      <p className="text-neo-white/80 font-neo-body text-sm mt-3">
        {parentView
          ? t('education.results.missGapWhatsAppParentSubtitle', { lesson })
          : t('education.results.missGapWhatsAppSubtitle')}
      </p>
      <p
        className="text-neo-lime/90 font-neo-body text-xs mt-2"
        data-testid="miss-gap-whatsapp-foil"
      >
        {t('education.results.missGapWhatsAppFoil')}
      </p>

      {payload.dueDate ? (
        <p
          className="mt-4 flex items-center gap-2 text-neo-cream font-bold text-sm"
          data-testid="miss-gap-whatsapp-due"
        >
          <ClipboardList className="w-4 h-4" aria-hidden />
          {t('education.results.missGapWhatsAppDue', { due: payload.dueDate })}
        </p>
      ) : null}

      <div className="mt-4 p-3 rounded-neo border border-brand-whatsapp/40 bg-brand-whatsapp/10">
        <p className="text-neo-white font-bold text-sm mb-2">
          {t('education.results.missGapWhatsAppWordsLabel')}
        </p>
        <ul className="flex flex-wrap gap-2" data-testid="miss-gap-whatsapp-words">
          {words.map((word) => (
            <li
              key={word}
              className="px-3 py-1.5 rounded-neo border-neo border-neo-black bg-neo-navy text-neo-white font-bold text-sm"
            >
              {word}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-neo-white/60 font-neo-body text-xs mt-3" data-testid="miss-gap-whatsapp-privacy">
        {t('education.results.missGapWhatsAppPrivacy')}
      </p>

      <div className="mt-5 flex flex-col gap-3">
        {!parentView && whatsappHref ? (
          <button
            type="button"
            data-testid="miss-gap-whatsapp-share"
            onClick={handleWhatsApp}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-3 font-bold',
              'bg-brand-whatsapp text-neo-black border-neo border-neo-black rounded-neo',
              'shadow-hard hover:shadow-hard-lg transition-all hover:bg-brand-whatsapp-hover',
            )}
          >
            {opened ? (
              <>
                <Check className="w-5 h-5" aria-hidden />
                {t('education.results.missGapWhatsAppOpened')}
              </>
            ) : (
              <>
                <WhatsAppIcon className="w-5 h-5" />
                {t('education.results.missGapWhatsAppShare')}
              </>
            )}
          </button>
        ) : null}

        <Link
          href={practiceHref}
          data-testid="miss-gap-whatsapp-open-practice"
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-3 font-bold',
            'bg-neo-lime text-neo-black border-neo border-neo-black rounded-neo',
            'shadow-hard-sm hover:shadow-hard transition-all',
          )}
        >
          <MessageCircle className="w-5 h-5" aria-hidden />
          {t('education.results.missGapWhatsAppOpenPractice')}
        </Link>

        {payload.dueDate ? (
          <Link
            href={homeworkHref}
            data-testid="miss-gap-whatsapp-open-homework"
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-sm',
              'bg-neo-cyan text-neo-black border-neo border-neo-black rounded-neo',
              'shadow-hard-sm hover:shadow-hard transition-all',
            )}
          >
            {t('education.results.missGapWhatsAppOpenHomework')}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
