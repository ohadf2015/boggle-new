'use client';

import { Fragment } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, GraduationCap, Link2, MessageCircle, Share2, type LucideIcon } from 'lucide-react';
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
  onShare: (channel: InviteChannel, payload: { url: string; text: string }) => void;
  t: T;
}

const CHIP_BASE = cn(
  'flex min-h-[56px] min-w-0 flex-col items-center justify-center gap-1 rounded-neo-lg border-[3px] border-neo-black px-1 py-1.5 shadow-hard-lg',
  'font-neo-display text-xs font-black leading-tight sm:text-sm',
  pressClasses(2),
);
// One color per way to share, so each reads at a glance (same blocks as the live game).
const CHIP = {
  copy: cn(CHIP_BASE, 'bg-neo-lime text-neo-black'),
  whatsapp: cn(CHIP_BASE, 'bg-neo-cyan text-neo-black'),
  google: cn(CHIP_BASE, 'bg-neo-yellow text-neo-black'),
  native: cn(CHIP_BASE, 'bg-neo-cream text-neo-black'),
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

  return (
    <div data-testid="invite-code-card" className="flex flex-col gap-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-neo-lg border-[3px] border-neo-black bg-neo-cream p-3 text-start text-neo-black shadow-hard-lime-xl sm:gap-5 sm:p-5 lg:flex-1 lg:grid-cols-1 lg:content-center lg:justify-items-center lg:gap-6 lg:p-7 lg:text-center">
        <div className="@container flex w-full min-w-0 flex-col gap-1 lg:items-center">
          <span className="font-neo-body text-xs font-black uppercase tracking-wide text-neo-black/70">{t('eduShell.setup.joinCode')}</span>
          <span
            data-testid="setup-join-code"
            dir="ltr"
            className="whitespace-nowrap font-neo-display font-black leading-none tracking-[0.04em] tabular-nums text-neo-black [font-size:clamp(2rem,17cqi,5.5rem)] lg:[font-size:clamp(2rem,17cqi,8rem)]"
          >
            {code}
          </span>
          {displayHost ? (
            <span dir="ltr" className="mt-1 inline-flex min-w-0 items-center gap-1 font-neo-body text-xs font-bold text-neo-black/80 min-[400px]:text-sm">
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
        <div data-testid="setup-qr" className="border-s-[2px] border-neo-black/20 ps-3 sm:ps-5 lg:border-s-0 lg:ps-0">
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
            <span aria-hidden="true" className="block size-[96px] animate-pulse rounded bg-neo-black/10 motion-reduce:animate-none min-[400px]:size-[112px] lg:size-[176px]" />
          )}
        </div>
      </div>

      {joinUrl ? (
        <div data-testid="setup-share-row" className="grid grid-cols-4 gap-2">
          <button type="button" data-testid="setup-copy-link" onClick={() => onShare('copy', payload)} className={CHIP.copy}>
            <ChipBody icon={Copy} label={t('eduShell.setup.copyLink')} />
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
