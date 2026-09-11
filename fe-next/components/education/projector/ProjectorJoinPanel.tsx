'use client';

import { memo, useCallback, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { tvJoinAddress } from '@/lib/education/tvJoinAddress';
import { codeCharacters } from './projectorLobbyModel';

interface ProjectorJoinPanelProps {
  gameCode: string;
  /** Locale segment of the join route — `/[locale]/join/[code]` is the only one that resolves. */
  language: string;
  baseUrl: string;
  t: (path: string, params?: Record<string, string | number>) => string;
}

/**
 * The one and only join instruction on the wall: the address to type, the code
 * at back-row size, and a single QR.
 *
 * Nothing else in the classroom lobby may print a code or a QR. The projector
 * used to carry two of each — `TvJoinBar` at the top of the TV lobby and
 * `ClassroomModeBanner`'s expanded panel above it — at different sizes, which
 * is how a class ends up half-scanning one and half-typing the other.
 *
 * `dir="ltr"` on both strings: the code and the URL are Latin/ASCII and must
 * not mirror in Hebrew, where the whole page is RTL.
 */
export const ProjectorJoinPanel = memo<ProjectorJoinPanelProps>(function ProjectorJoinPanel({
  gameCode,
  language,
  baseUrl,
  t,
}) {
  const joinUrl = `${baseUrl}/${language}/join/${gameCode}`;
  const address = tvJoinAddress(baseUrl, language, gameCode);
  const chars = codeCharacters(gameCode);
  const [copied, setCopied] = useState(false);

  // Copy the LINK, never the bare code. A teacher pastes this into Google
  // Classroom, Teams or a parent email, where six characters are a dead end —
  // and the URL already carries the code for anyone reading it aloud.
  const handleCopy = useCallback(async () => {
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
      className="grid items-center gap-[2vw] md:grid-cols-[minmax(0,1fr)_auto]"
    >
      <div className="min-w-0">
        {/* Step 1 — where to go. */}
        <p className="font-neo-body text-[3vw] font-black uppercase tracking-[0.2em] text-neo-lime md:text-[1.1vw]">
          {t('education.projectorLobby.joinAt')}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-[1vw]">
          <p
            data-testid="projector-join-address"
            dir="ltr"
            className="min-w-0 break-all font-neo-display text-[min(4.6vw,5vh)] font-black leading-tight text-neo-cream md:text-[min(2.1vw,4.5vh)]"
          >
            {address}
          </p>
          {/* Small on purpose: on the wall it is noise, on the teacher's own
              laptop it is how the link reaches Google Classroom. */}
          <button
            type="button"
            onClick={handleCopy}
            aria-label={t('share.copyLink')}
            className={cn(
              'shrink-0 rounded-neo border-3 border-neo-black p-2 text-neo-navy shadow-hard-sm',
              'transition-all active:translate-y-0.5 active:shadow-none',
              copied ? 'bg-neo-lime' : 'bg-neo-cream'
            )}
          >
            {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
          </button>
        </div>

        {/* Step 2 — the code, the single loudest thing in the room. */}
        <p className="mt-[1.5vw] font-neo-body text-[3vw] font-black uppercase tracking-[0.2em] text-neo-pink md:text-[1.1vw]">
          {t('education.projectorLobby.gameCode')}
        </p>
        <div
          data-testid="projector-code"
          dir="ltr"
          role="status"
          aria-label={t('education.projectorLobby.gameCode') + ': ' + chars.join(' ')}
          // `max-w-full` + `overflow-x-auto`: on the wall the row never fills its
          // line, but the teacher's own phone is the same component, and a 360px
          // handset must scroll the sixth character into view rather than clip it
          // off-screen where nobody knows it exists. The `py` keeps the hard
          // shadow and the ±1.4° tilt inside the scroller instead of shaving them.
          className="mt-[0.5vw] flex max-w-full flex-nowrap items-center gap-[0.06em] overflow-x-auto py-[0.1em] font-neo-display text-[min(16vw,11vh)] font-black leading-none md:text-[min(12vw,22vh)]"
        >
          {chars.map((char, index) => (
            <span
              key={`${char}-${index}`}
              data-testid="projector-code-char"
              aria-hidden="true"
              style={{ transform: `rotate(${index % 2 === 0 ? -1.4 : 1.4}deg)` }}
              className={cn(
                'inline-flex min-w-[0.78em] items-center justify-center',
                'rounded-[0.09em] border-[0.035em] border-neo-black',
                'bg-neo-cream px-[0.06em] pb-[0.06em] text-neo-navy',
                'shadow-hard-lg'
              )}
            >
              {char}
            </span>
          ))}
        </div>
      </div>

      {/* One QR. Scales with the projector, floored for a phone, and — like the
          code — ceilinged in `vh`, because the teacher's mirrored laptop window
          is wider than 16:9 and a width-only size steals the roster's height. */}
      <div
        data-testid="projector-qr"
        data-join-url={joinUrl}
        className="mx-auto flex w-fit flex-col items-center gap-2 rounded-neo border-neo-thick border-neo-black bg-neo-cream p-[1vw] shadow-hard-lg md:rotate-2"
      >
        <QRCodeSVG
          value={joinUrl}
          size={512}
          level="M"
          bgColor="#ffffff"
          fgColor="#000000"
          title={t('education.projectorLobby.scanToJoin')}
          className="h-auto w-[min(26vw,22vh)] min-w-[104px] max-w-[260px] md:w-[min(15vw,26vh)] md:max-w-none"
        />
        <span className="font-neo-display text-[2.6vw] font-black uppercase tracking-widest text-neo-navy md:text-[0.95vw]">
          {t('education.projectorLobby.scanToJoin')}
        </span>
      </div>
    </section>
  );
});

export default ProjectorJoinPanel;
