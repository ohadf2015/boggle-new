'use client';

import { memo, useCallback, useState, type CSSProperties } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { tvJoinAddress } from '@/lib/education/tvJoinAddress';
import { PRESS, useShuffledOrder, type Translate } from '@/components/education/live/eduLiveStyles';
import { HERO_CODE_TEXT, HERO_QR_SIZE, codeCharacters } from './projectorLobbyModel';

interface ProjectorJoinPanelProps {
  gameCode: string;
  /** Locale segment of the join route: only `/[locale]/join/[code]` resolves. */
  language: string;
  baseUrl: string;
  t: Translate;
  /** Nobody in yet: the QR beckons so the room's eye goes to the way in. */
  waiting?: boolean;
}

/** The only code and QR on the wall. Code and address are ASCII, so they stay LTR inside an RTL page. */
export const ProjectorJoinPanel = memo<ProjectorJoinPanelProps>(function ProjectorJoinPanel({ gameCode, language, baseUrl, t, waiting = false }) {
  const joinUrl = `${baseUrl}/${language}/join/${gameCode}`;
  const address = `${tvJoinAddress(baseUrl, language, '')}/join`;
  const chars = codeCharacters(gameCode);
  const dropOrder = useShuffledOrder(chars.length);
  const [copied, setCopied] = useState(false);

  // The link, never the bare code: pasted into Google Classroom, six characters are a dead end.
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
    <section
      data-testid="projector-join-panel"
      className="flex h-full flex-col items-center justify-center gap-[clamp(0.5rem,1.8cqh,1.75rem)] rounded-neo-lg border-4 border-neo-cream bg-neo-navy/90 p-[clamp(0.75rem,1.4cqw,2rem)] shadow-hard-lg"
    >
      <div className="flex w-full flex-wrap items-center justify-center gap-x-[0.5em] gap-y-1 font-neo-display font-black leading-tight text-[clamp(1.125rem,min(2.4cqw,4.4cqh),3.75rem)]">
        <span className="text-[0.62em] uppercase tracking-wider text-neo-cream">{t('eduLiveRoom.lobby.joinAt')}</span>
        <span data-testid="projector-join-address" dir="ltr" className="min-w-0 break-all text-neo-lime [unicode-bidi:isolate]">
          {address}
        </span>
        <button
          type="button"
          data-testid="projector-copy"
          onClick={copy}
          aria-label={t('eduLiveRoom.lobby.copyLink')}
          title={t('eduLiveRoom.lobby.copyLink')}
          className={cn('grid size-11 shrink-0 place-items-center rounded-neo border-[3px] border-neo-cream bg-neo-navy text-neo-cream shadow-hard-sm hover:bg-neo-navy-elevated', PRESS)}
        >
          {copied ? <Check className="size-5" aria-hidden="true" /> : <Copy className="size-5" aria-hidden="true" />}
        </button>
      </div>

      <div
        data-testid="projector-code"
        dir="ltr"
        role="status"
        aria-label={`${t('education.projectorLobby.gameCode')}: ${chars.join(' ')}`}
        className={cn('flex max-w-full items-center gap-[0.06em] font-neo-display font-black leading-none tabular-nums [unicode-bidi:isolate]', HERO_CODE_TEXT)}
      >
        {chars.map((char, index) => (
          <span
            key={`${char}-${index}`}
            data-testid="projector-code-char"
            aria-hidden="true"
            style={{ '--tilt': `${index % 2 === 0 ? -1.4 : 1.4}deg`, transform: 'rotate(var(--tilt))', animationDelay: `${dropOrder[index] * 70 + 180}ms` } as CSSProperties}
            className="inline-flex min-w-[0.78em] items-center justify-center rounded-[0.09em] border-[0.035em] border-neo-black bg-neo-cream px-[0.04em] pb-[0.05em] text-neo-navy shadow-hard-lg motion-safe:animate-[edu-live-drop_520ms_cubic-bezier(0.34,1.56,0.64,1)_backwards]"
          >
            {char}
          </span>
        ))}
      </div>

      <div
        data-testid="projector-qr"
        data-waiting={waiting ? 'true' : 'false'}
        data-join-url={joinUrl}
        className="relative shrink-0 rounded-neo-lg border-4 border-neo-black bg-neo-white p-[clamp(0.375rem,0.8cqw,1rem)] shadow-hard-lg"
      >
        {waiting && (
          <span aria-hidden="true" className="pointer-events-none absolute -inset-[10px] rounded-neo-lg border-4 border-neo-lime motion-safe:animate-[edu-live-beckon_2.2s_ease-in-out_infinite]" />
        )}
        <QRCodeSVG value={joinUrl} size={512} level="M" title={t('education.projectorLobby.scanToJoin')} className={cn('block', HERO_QR_SIZE)} />
      </div>
    </section>
  );
});

export default ProjectorJoinPanel;
