'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Link2, MonitorPlay, Play, Share2, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EduMascot } from '@/components/education/EduMascot';
import { classroomJoinUrl } from '@/lib/education/classroomInvitePayload';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import { buildGoogleClassroomShareUrl } from '@/lib/education/googleClassroomShare';
import { PANEL, PRIMARY_BUTTON, QUIET_LINK, SECONDARY_BUTTON } from '../home/homeStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface ClassReadyProps {
  classroom: { id: string; name: string; join_code: string };
  language: string;
  /** Fired once, when the code is first on screen — the share step's marker. */
  onShown: () => void;
  onCopy: (url: string) => void;
  onShareLink: (method: 'whatsapp' | 'google_classroom') => void;
  onNativeShare: (share: { title: string; text: string; url: string }) => void;
  /** Students on the roster; null until the first read settles. */
  joined: number | null;
  onOpenProjector: () => void;
  t: T;
}

const SHARE_CHIP =
  'inline-flex min-h-[44px] min-w-0 items-center justify-center gap-1.5 rounded-neo border-2 border-neo-cream/40 bg-neo-navy px-2 font-neo-display text-sm font-bold text-neo-cream hover:border-neo-cream focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan';

function googleShareHref(joinUrl: string, name: string, t: T): string | null {
  try {
    return buildGoogleClassroomShareUrl({
      joinUrl,
      title: t('teacher.classroom.googleClassroomTitle', { name }),
      body: t('teacher.classroom.googleClassroomBody'),
    });
  } catch {
    return null;
  }
}

/** Step 2: the join code at back-row size, one-tap share, a live joined count; the game CTA leads once someone is in. */
export function ClassReady({
  classroom,
  language,
  onShown,
  onCopy,
  onShareLink,
  onNativeShare,
  joined,
  onOpenProjector,
  t,
}: ClassReadyProps) {
  // The origin is browser-only; until it is known the QR and link wait (no SSR guess to correct later).
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    onShown();
  }, [onShown]);

  const joinUrl = origin ? classroomJoinUrl(origin, language, classroom.join_code) : '';
  const displayHost = origin ? `${origin.replace(/^https?:\/\//, '')}/${language}/join` : '';
  const shareText = t('teacher.classroom.shareInviteText', { name: classroom.name, code: classroom.join_code });
  const googleHref = joinUrl ? googleShareHref(joinUrl, classroom.name, t) : null;
  const studentsIn = (joined ?? 0) > 0;
  const startHref = teacherHostHref(language, { classroomId: classroom.id });

  return (
    <section data-testid="setup-step-ready" aria-labelledby="setup-ready-title" className="flex flex-col items-center gap-5 text-center">
      <EduMascot moment="success" animate size={200} className="size-40 sm:size-48" />
      <div className="flex flex-col gap-1">
        <h1 id="setup-ready-title" tabIndex={-1} className="font-neo-display outline-none text-3xl font-black leading-tight text-neo-cream sm:text-4xl">
          {t('eduShell.setup.readyTitle')}
        </h1>
        <p dir="auto" className="font-neo-body text-base font-semibold text-neo-cream/80">
          {classroom.name}
        </p>
      </div>

      <div className={cn(PANEL, 'grid w-full max-w-md grid-cols-1 items-center gap-3 border-neo-black bg-neo-cream p-4 text-start text-neo-black min-[440px]:grid-cols-[minmax(0,1fr)_auto] min-[440px]:gap-4 sm:p-5')}>
        <div className="@container flex min-w-0 flex-col gap-1">
          <span className="font-neo-body text-xs font-black uppercase tracking-wide text-neo-black/70">{t('eduShell.setup.joinCode')}</span>
          <span
            data-testid="setup-join-code"
            dir="ltr"
            className="whitespace-nowrap font-neo-display font-black leading-none tracking-[0.04em] text-neo-black tabular-nums [font-size:clamp(1.75rem,15cqi,3.75rem)]"
          >
            {classroom.join_code}
          </span>
          {displayHost ? (
            <span dir="ltr" className="mt-1 inline-flex min-w-0 items-center gap-1 font-neo-body text-sm font-bold text-neo-black/80">
              <Link2 className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{displayHost}</span>
            </span>
          ) : null}
        </div>
        <div data-testid="setup-qr" className="flex justify-center border-t-[2px] border-neo-black/20 pt-3 min-[440px]:border-s-[2px] min-[440px]:border-t-0 min-[440px]:ps-4 min-[440px]:pt-0">
          {joinUrl ? (
            <QRCodeSVG value={joinUrl} size={104} bgColor="transparent" fgColor="#000000" aria-label={t('eduShell.setup.qrLabel')} />
          ) : (
            <span aria-hidden="true" className="block size-[104px] animate-pulse rounded bg-neo-black/10 motion-reduce:animate-none" />
          )}
        </div>
      </div>

      <p
        data-testid="setup-joined-count"
        aria-live="polite"
        className="inline-flex items-center gap-2 font-neo-display text-lg font-bold text-neo-cream"
      >
        <UsersRound className={cn('size-5', studentsIn ? 'text-neo-lime' : 'text-neo-cream/60')} aria-hidden="true" />
        {joined === null
          ? '…'
          : joined === 0
            ? t('eduShell.setup.joinedNone')
            : joined === 1
              ? t('eduShell.setup.joinedOne')
              : t('eduShell.setup.joinedMany', { count: joined })}
      </p>

      <div className="flex w-full max-w-md flex-col gap-3">
        {studentsIn ? (
          <Link href={startHref} data-testid="setup-start-game" data-hero="true" className={cn(PRIMARY_BUTTON, 'w-full text-xl')}>
            <Play className="size-6 fill-current" aria-hidden="true" />
            {t('eduShell.setup.startQuick')}
          </Link>
        ) : null}
        <button
          type="button"
          data-testid="setup-copy-link"
          data-hero={studentsIn ? 'false' : 'true'}
          disabled={!joinUrl}
          onClick={() => onCopy(joinUrl)}
          className={cn(studentsIn ? SECONDARY_BUTTON : PRIMARY_BUTTON, 'w-full')}
        >
          <Copy className="size-5" aria-hidden="true" />
          {t('eduShell.setup.copyLink')}
        </button>
        {joinUrl ? (
          <div data-testid="setup-share-row" className="grid grid-cols-3 gap-2">
            <a
              data-testid="setup-share-whatsapp"
              href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${joinUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onShareLink('whatsapp')}
              className={SHARE_CHIP}
            >
              <span className="line-clamp-2">{t('eduShell.setup.shareWhatsapp')}</span>
            </a>
            {googleHref ? (
              <a
                data-testid="setup-share-google"
                href={googleHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onShareLink('google_classroom')}
                className={SHARE_CHIP}
              >
                <span className="line-clamp-2">{t('eduShell.setup.shareGoogle')}</span>
              </a>
            ) : null}
            <button
              type="button"
              data-testid="setup-share-native"
              onClick={() => onNativeShare({ title: classroom.name, text: shareText, url: joinUrl })}
              className={SHARE_CHIP}
            >
              <Share2 className="size-4 shrink-0" aria-hidden="true" />
              <span className="line-clamp-2">{t('eduShell.setup.shareMore')}</span>
            </button>
          </div>
        ) : null}
        <p className="font-neo-body text-sm text-neo-cream/70">{t('eduShell.setup.noAccount')}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {studentsIn ? null : (
            <Link href={startHref} data-testid="setup-start-game" data-hero="false" className={QUIET_LINK}>
              <Play className="size-4" aria-hidden="true" />
              {t('eduShell.setup.startNow')}
            </Link>
          )}
          <button type="button" data-testid="setup-projector" onClick={onOpenProjector} className={QUIET_LINK}>
            <MonitorPlay className="size-4" aria-hidden="true" />
            {t('eduShell.setup.showProjector')}
          </button>
          <Link href={`/${language}/teacher`} className={QUIET_LINK}>
            {t('eduShell.setup.backHome')}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default ClassReady;
