'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, GraduationCap, Link2, MessageCircle, Share2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildGoogleClassroomShareUrl } from '@/lib/education/googleClassroomShare';
import { pressClasses } from '@/components/education/motion';

type T = (key: string, params?: Record<string, string | number>) => string;

export type InviteChannel = 'copy' | 'whatsapp' | 'google_classroom' | 'native';

export interface ClassSetupInviteCodeProps {
  code: string;
  className: string;
  /** Empty until the browser origin is known: the QR and links wait rather than guess. */
  joinUrl: string;
  displayHost: string;
  /** Resolves true once the link really reached the clipboard or the share sheet. */
  onShare: (channel: InviteChannel, payload: { url: string; text: string }) => void | boolean | Promise<void | boolean>;
  t: T;
}

const CHIP_BASE = cn(
  'flex min-h-[64px] min-w-0 flex-col items-center justify-center gap-1 rounded-neo-lg border-[3px] border-neo-black px-1 py-1.5 shadow-hard',
  'font-neo-display text-xs font-black leading-tight sm:text-sm [&>svg]:size-6',
  pressClasses(2),
);
// One color per way to share (same blocks as the live game); none is lime, which belongs to the screen's start button.
const CHIP = {
  copy: cn(CHIP_BASE, 'bg-neo-pink text-neo-black'),
  whatsapp: cn(CHIP_BASE, 'bg-neo-cyan text-neo-black'),
  google: cn(CHIP_BASE, 'bg-neo-yellow text-neo-black'),
  native: cn(CHIP_BASE, 'bg-edu-surface text-edu-ink border-edu-line'),
};

function googleHref(joinUrl: string, name: string, t: T): string | null {
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

function ChipBody({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <>
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className="line-clamp-2 text-center">{label}</span>
    </>
  );
}

/** The code at back-row size, its QR, and every way to send it, all in one card so nothing about sharing sits below the fold. */
export function ClassSetupInviteCode({ code, className, joinUrl, displayHost, onShare, t }: ClassSetupInviteCodeProps) {
  const text = t('teacher.classroom.shareInviteText', { name: className, code });
  const google = joinUrl ? googleHref(joinUrl, className, t) : null;
  const payload = { url: joinUrl, text };
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);
  const copy = async () => {
    const ok = await onShare('copy', payload);
    if (ok !== true) return;
    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 2000);
  };
  const codeText = (
    <span
      data-testid="setup-join-code"
      dir="ltr"
      className="inline-flex gap-[0.15em] whitespace-nowrap font-neo-display font-black leading-none [font-size:clamp(1.5rem,12cqi,3.5rem)] lg:[font-size:clamp(1.5rem,12cqi,4.5rem)]"
    >
      {[...code].map((ch, i) => (
        <span key={i} data-testid="setup-join-code-tile" className="edu-tile h-[1.35em] w-[1.05em] rounded-[0.22em]">
          {ch}
        </span>
      ))}
    </span>
  );

  return (
    <div
      data-testid="invite-code-card"
      className="edu-card flex flex-col gap-3 p-3 sm:p-4 lg:p-5"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-start sm:gap-5 lg:flex-1 lg:grid-cols-1 lg:content-center lg:justify-items-center lg:gap-5 lg:py-2 lg:text-center">
        <div className="@container flex w-full min-w-0 flex-col gap-1 lg:items-center">
          <span className="font-neo-body text-xs font-black uppercase tracking-wide text-edu-ink/75 sm:text-sm">{t('eduShell.setup.joinCode')}</span>
          {joinUrl ? (
            <button
              type="button"
              data-testid="setup-code-copy"
              onClick={() => void copy()}
              aria-label={t('eduShell.setup.copyLink')}
              className={cn('min-h-11 self-start rounded-neo px-1 text-start focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-edu-line lg:self-center', pressClasses(2))}
            >
              {codeText}
            </button>
          ) : (
            codeText
          )}
          {displayHost ? (
            <span dir="ltr" className="mt-1 inline-flex min-w-0 items-center gap-1 font-neo-body text-xs font-bold text-edu-ink min-[400px]:text-sm lg:text-base">
              <Link2 className="size-4 shrink-0" aria-hidden="true" />
              {/* Never truncated: a student types this. If it still cannot fit, it breaks after a slash. */}
              <span data-testid="setup-join-address" className="min-w-0">
                {displayHost.split('/').map((part, i, all) => (
                  <Fragment key={i}>{part}{i < all.length - 1 ? <>/<wbr /></> : null}</Fragment>
                ))}
              </span>
            </span>
          ) : null}
        </div>
        <div data-testid="setup-qr" className="border-s-[2px] border-edu-line/20 ps-3 sm:ps-5 lg:border-s-0 lg:ps-0">
          {joinUrl ? (
            <QRCodeSVG
              value={joinUrl}
              size={176}
              bgColor="transparent"
              // h-check-ok: QR modules stay literal black so every scanner reads them
              fgColor="#000000"
              aria-label={t('eduShell.setup.qrLabel')}
              className="block size-[96px] min-[400px]:size-[112px] lg:size-[176px]"
            />
          ) : (
            <span aria-hidden="true" className="block size-[96px] animate-pulse rounded bg-edu-ink/10 motion-reduce:animate-none min-[400px]:size-[112px] lg:size-[176px]" />
          )}
        </div>
      </div>

      {joinUrl ? (
        <div data-testid="setup-share-row" className="grid grid-cols-4 gap-2 border-t-2 border-dashed border-edu-line/25 pt-3">
          <button type="button" data-testid="setup-copy-link" onClick={() => void copy()} className={CHIP.copy}>
            <ChipBody icon={copied ? Check : Copy} label={t(copied ? 'eduShell.setup.copied' : 'eduShell.setup.copyLink')} />
          </button>
          <a
            data-testid="setup-share-whatsapp"
            href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${joinUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onShare('whatsapp', payload)}
            className={CHIP.whatsapp}
          >
            <ChipBody icon={MessageCircle} label={t('eduShell.setup.shareWhatsapp')} />
          </a>
          {google ? (
            <a
              data-testid="setup-share-google"
              href={google}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onShare('google_classroom', payload)}
              className={CHIP.google}
            >
              <ChipBody icon={GraduationCap} label={t('eduShell.setup.shareGoogle')} />
            </a>
          ) : null}
          <button type="button" data-testid="setup-share-native" onClick={() => onShare('native', payload)} className={CHIP.native}>
            <ChipBody icon={Share2} label={t('eduShell.setup.shareMore')} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default ClassSetupInviteCode;
