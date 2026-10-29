'use client';

/**
 * Empty live lobby: teachers tried the game alone or against bots and ended it
 * (Oct 2026 replays), then most never came back. Joining from their own phone
 * shows the student side. The link carries ?rehearsal=1, so the seat is a test
 * seat that never counts as a student (one per class, see honorRehearsalJoin).
 * The QR stays behind a tap so students reading the projector scan the real one.
 */
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackEduPhoneTestOpened } from '@/lib/education/rehearsalTelemetry';
import { PRESS, type Translate } from './eduLiveStyles';

interface EduPhoneTestPromptProps {
  gameCode: string;
  language: string;
  baseUrl: string;
  mode: string;
  t: Translate;
}

export function phoneTestUrl(baseUrl: string, language: string, gameCode: string): string {
  return `${baseUrl}/${language}/join/${gameCode}?rehearsal=1`;
}

export function EduPhoneTestPrompt({ gameCode, language, baseUrl, mode, t }: EduPhoneTestPromptProps) {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    if (!open) trackEduPhoneTestOpened({ mode });
    setOpen((v) => !v);
  };

  return (
    <div data-testid="edu-phone-test" className="flex flex-col gap-2 md:gap-[0.6vw]">
      <button
        type="button"
        data-testid="edu-phone-test-open"
        aria-expanded={open}
        onClick={toggle}
        className={cn('inline-flex items-center gap-2 self-start rounded-neo border-[3px] border-neo-cream bg-neo-navy-light px-3 py-1.5 font-neo-display text-base font-black text-neo-cream shadow-hard-sm hover:bg-neo-navy md:text-[1.1vw]', PRESS)}
      >
        <Smartphone className="size-[1.1em]" aria-hidden="true" />
        {t('eduLiveRoom.lobby.phoneTestCta')}
      </button>
      {open && (
        <div data-testid="edu-phone-test-qr" className="flex items-center gap-3 md:gap-[1vw]">
          <div className="shrink-0 rounded-neo border-[3px] border-neo-black bg-neo-white p-1.5 shadow-hard-sm">
            <QRCodeSVG value={phoneTestUrl(baseUrl, language, gameCode)} size={112} level="M" />
          </div>
          <p className="font-neo-body text-sm font-bold text-neo-cream/85 md:text-[1vw]">{t('eduLiveRoom.lobby.phoneTestHint')}</p>
        </div>
      )}
      {!open && <p className="sr-only">{t('eduLiveRoom.lobby.phoneTestHint')}</p>}
    </div>
  );
}
