'use client';

import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Printer } from 'lucide-react';
import { classroomJoinUrl } from '@/lib/education/classroomInvitePayload';
import { safeCapture } from '@/lib/education/telemetry';

/** 8 slips fill one A4 / Letter page in two columns. */
export const SLIPS_PER_PAGE = 8;

const CODE_RE = /^[A-Z0-9]{4,8}$/;

/**
 * Print only the slips: site chrome, the cookie banner and any fixed overlay
 * stay off the paper, and the sheet starts at the top of page one.
 */
const PRINT_CSS =
  '@page{size:auto;margin:10mm}' +
  '@media print{html,body{background:#fff!important}' +
  'body *{visibility:hidden!important}' +
  '[data-testid="join-sheet"],[data-testid="join-sheet"] *{visibility:visible!important}' +
  '[data-testid="join-sheet"]{position:absolute;inset:0 auto auto 0;width:100%}}';

/** Join codes are short upper-case alphanumerics; anything else is not a class code. */
export function normalizeJoinCode(raw: string | null | undefined): string | null {
  const code = (raw ?? '').trim().toUpperCase();
  return CODE_RE.test(code) ? code : null;
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface JoinSheetProps {
  code: string | null;
  className: string;
  origin: string;
  language: string;
  t: Translate;
}

/**
 * A printable sheet of cut-out join slips: QR + code + the typed-URL fallback.
 * Black on white (ink-friendly), no student data: only what the teacher already
 * projects. The toolbar hides itself in print.
 */
export function JoinSheet({ code, className, origin, language, t }: JoinSheetProps) {
  if (!code) {
    return (
      <main data-testid="join-sheet-invalid" className="mx-auto max-w-lg p-6 font-neo-body text-neo-cream">
        <p className="mb-4 font-bold">{t('teacher.joinSheet.invalid')}</p>
        <Link href={`/${language}/teacher`} className="underline">{t('teacher.joinSheet.back')}</Link>
      </main>
    );
  }
  const joinUrl = origin ? classroomJoinUrl(origin, language, code) : '';
  const typedUrl = origin ? `${origin.replace(/^https?:\/\//, '').replace(/\/$/, '')}/${language}/join` : '';
  const name = className.trim() || code;
  const print = () => {
    safeCapture('edu_join_sheet_printed', { slips: SLIPS_PER_PAGE });
    window.print();
  };

  return (
    <div data-testid="join-sheet" className="min-h-dvh bg-neo-navy print:min-h-0 print:bg-white">
      <style>{PRINT_CSS}</style>
      <header className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 p-4 print:hidden">
        <Link
          href={`/${language}/teacher`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-neo border-[3px] border-neo-cream px-3 font-neo-body text-sm font-bold text-neo-cream hover:bg-neo-navy-light"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
          {t('teacher.joinSheet.back')}
        </Link>
        <div className="min-w-0 flex-1 basis-60">
          <h1 className="font-neo-display text-xl font-black text-neo-cream" dir="auto">{t('teacher.joinSheet.title', { name })}</h1>
          <p className="font-neo-body text-sm text-neo-cream/80">{t('teacher.joinSheet.subtitle')}</p>
        </div>
        <button
          type="button"
          data-testid="join-sheet-print"
          onClick={print}
          aria-label={t('teacher.joinSheet.printAria')}
          className="inline-flex min-h-11 items-center gap-2 rounded-neo border-[3px] border-neo-black bg-neo-lime px-4 font-neo-display font-black text-neo-black shadow-hard hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
        >
          <Printer className="size-5" aria-hidden="true" />
          {t('teacher.joinSheet.print')}
        </button>
      </header>

      <ol
        aria-label={t('teacher.joinSheet.title', { name })}
        className="mx-auto grid max-w-3xl grid-cols-1 gap-0 bg-white p-2 sm:grid-cols-2 print:max-w-none print:grid-cols-2 print:p-0"
      >
        {Array.from({ length: SLIPS_PER_PAGE }, (_, i) => (
          <li
            key={i}
            data-testid="join-slip"
            className="flex break-inside-avoid items-center gap-3 border border-dashed border-neutral-500 p-3 text-black print:min-h-[62mm] print:gap-4 print:p-5"
          >
            <div className="shrink-0 bg-white p-1" aria-hidden="true">
              {joinUrl ? <QRCodeSVG value={joinUrl} size={104} level="M" /> : <div className="size-[104px]" />}
            </div>
            <div className="min-w-0 flex-1 font-neo-body">
              <p className="font-neo-display text-base font-black leading-tight">{t('teacher.joinSheet.slipHeading')}</p>
              <p className="truncate text-sm font-bold" dir="auto">{name}</p>
              <p className="mt-1 text-xs leading-snug">{t('teacher.joinSheet.slipScan')}</p>
              <p className="text-xs leading-snug">
                {t('teacher.joinSheet.slipOr')} <span dir="ltr" className="font-bold">{typedUrl}</span> {t('teacher.joinSheet.slipType')}
              </p>
              <p dir="ltr" data-testid="join-slip-code" className="mt-1 font-mono text-2xl font-black tracking-[0.3em]">{code}</p>
              <p className="text-[11px] leading-snug text-neutral-700">{t('teacher.joinSheet.slipNoAccount')}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
