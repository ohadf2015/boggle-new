'use client';

import { useCallback, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { tvJoinAddress } from '@/lib/education/tvJoinAddress';
import { codeCharacters } from '@/components/education/projector/projectorLobbyModel';
import { PRESS, type Translate } from './eduLiveStyles';

interface EduJoinCardProps {
  gameCode: string;
  language: string;
  baseUrl: string;
  t: Translate;
}

/** Address, back-row code and the one QR. Code and URL are ASCII, so they never mirror in RTL. */
export function EduJoinCard({ gameCode, language, baseUrl, t }: EduJoinCardProps) {
  const joinUrl = `${baseUrl}/${language}/join/${gameCode}`;
  const address = `${tvJoinAddress(baseUrl, language, '')}/join`;
  const [copied, setCopied] = useState(false);

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
    <section data-testid="edu-join-card" className="flex flex-col gap-3 md:gap-[1vw]">
      <div className="flex items-center gap-3 rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy-light px-4 py-2.5 shadow-hard md:px-[1.2vw] md:py-[0.7vw]">
        <Globe className="size-7 shrink-0 text-neo-cyan md:size-[2.2vw]" aria-hidden="true" />
        <div className="min-w-0 font-neo-display font-black leading-tight">
          <p className="text-base text-neo-cream md:text-[1.5vw]">{t('eduLiveRoom.lobby.joinAt')}</p>
          <p data-testid="edu-lobby-address" dir="ltr" className="truncate text-lg text-neo-lime md:text-[1.9vw]">{address}</p>
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
        className="flex justify-center gap-[0.06em] rounded-neo-lg border-4 border-neo-black bg-neo-lime px-3 py-2 font-neo-display text-[15vw] font-black leading-none text-neo-white shadow-hard-xl md:px-[1vw] md:py-[0.6vw] md:text-[min(7vw,11vh)]"
      >
        {codeCharacters(gameCode).map((ch, i) => (
          <span key={`${ch}-${i}`} className="[-webkit-text-stroke:0.07em_#000] [paint-order:stroke_fill] drop-shadow-[0.05em_0.05em_0_#000]">
            {ch}
          </span>
        ))}
      </div>

      <div className="flex justify-center">
        <div className="shrink-0 rounded-neo-lg border-4 border-neo-black bg-neo-white p-2 shadow-hard-lg md:p-[min(0.6vw,0.9vh)]">
          <QRCodeSVG value={joinUrl} size={512} level="M" className="size-36 shrink-0 md:size-[min(11vw,17vh)]" />
        </div>
      </div>
    </section>
  );
}

export default EduJoinCard;
