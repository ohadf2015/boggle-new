'use client';

import { useCallback, useState, type CSSProperties } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { tvJoinAddress } from '@/lib/education/tvJoinAddress';
import { codeCharacters } from '@/components/education/projector/projectorLobbyModel';
import { PRESS, tiltOf, useShuffledOrder, type Translate } from './eduLiveStyles';

interface EduJoinCardProps {
  gameCode: string;
  language: string;
  baseUrl: string;
  t: Translate;
  /** Nobody in yet: the QR breathes so the room's eye goes to the way in. */
  waiting?: boolean;
}

/** Address, back-row code and the one QR. Code and URL are ASCII, so they never mirror in RTL. */
export function EduJoinCard({ gameCode, language, baseUrl, t, waiting = false }: EduJoinCardProps) {
  const joinUrl = `${baseUrl}/${language}/join/${gameCode}`;
  const address = `${tvJoinAddress(baseUrl, language, '')}/join`;
  const [copied, setCopied] = useState(false);
  const dropOrder = useShuffledOrder(codeCharacters(gameCode).length);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      toast.success(t('share.linkCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('share.codeCopyError'));
    }
  }, [joinUrl, t]);

  return (
    <section data-testid="edu-join-card" className="flex h-full flex-col gap-3 md:gap-[1vw]">
      <div className="flex items-center gap-3 rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy-light px-4 py-2.5 shadow-hard md:px-[1.2vw] md:py-[0.7vw]">
        <Globe className="size-7 shrink-0 text-neo-cyan md:size-[2.2vw]" aria-hidden="true" />
        <div className="min-w-0 font-neo-display font-black leading-tight">
          <p className="text-base text-neo-cream md:text-[1.4vw]">{t('eduLiveRoom.lobby.joinAt')}</p>
          <p data-testid="edu-lobby-address" dir="ltr" className="truncate text-lg text-neo-lime md:text-[2.1vw]">{address}</p>
        </div>
        <button
          type="button"
          data-testid="edu-lobby-copy"
          onClick={copy}
          aria-label={t('eduLiveRoom.lobby.copyLink')}
          title={t('eduLiveRoom.lobby.copyLink')}
          className={cn('ms-auto grid size-11 shrink-0 place-items-center rounded-neo border-[3px] border-neo-cream bg-neo-navy text-neo-cream shadow-hard-sm hover:bg-neo-navy-elevated', PRESS)}
        >
          {copied ? <Check className="size-5" aria-hidden="true" /> : <Copy className="size-5" aria-hidden="true" />}
        </button>
      </div>

      <div
        data-testid="edu-lobby-code"
        dir="ltr"
        aria-label={gameCode}
        className="flex justify-center gap-[0.06em] rounded-neo-lg border-4 border-neo-black bg-neo-lime px-3 py-2 font-neo-display text-[15vw] font-black leading-none text-neo-white shadow-hard-xl md:px-[1vw] md:py-[0.8vw] md:text-[min(8.5vw,15vh)]"
      >
        {codeCharacters(gameCode).map((ch, i) => (
          <span
            key={`${ch}-${i}`}
            style={{ '--tilt': tiltOf(`${gameCode}${i}`), animationDelay: `${dropOrder[i] * 70 + 180}ms` } as CSSProperties}
            className="inline-block [-webkit-text-stroke:0.07em_rgb(var(--neo-black))] [paint-order:stroke_fill] drop-shadow-[0.05em_0.05em_0_rgb(var(--neo-black))] motion-safe:animate-[edu-live-drop_520ms_cubic-bezier(0.34,1.56,0.64,1)_both]"
          >
            {ch}
          </span>
        ))}
      </div>

      <div className="flex flex-1 items-center justify-center md:min-h-0">
        <div
          data-testid="edu-lobby-qr"
          data-waiting={waiting ? 'true' : 'false'}
          className="relative shrink-0 rounded-neo-lg border-4 border-neo-black bg-neo-white p-2 shadow-hard-lg md:p-[min(0.7vw,1.1vh)]"
        >
          {waiting && (
            <span aria-hidden="true" className="pointer-events-none absolute -inset-[10px] rounded-neo-lg border-4 border-neo-lime motion-safe:animate-[edu-live-beckon_2.2s_ease-in-out_infinite]" />
          )}
          <QRCodeSVG value={joinUrl} size={512} level="M" className="size-32 shrink-0 md:size-[min(18vw,34vh)]" />
        </div>
      </div>
    </section>
  );
}

export default EduJoinCard;
