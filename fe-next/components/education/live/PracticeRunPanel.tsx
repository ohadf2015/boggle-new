'use client';

/**
 * Practice run: the teacher's board on the left, their own student view on the
 * right. The student view is the real student page in a same-origin frame
 * (?practiceSeat=1): it keeps the teacher's account but gets its own practice
 * seat, never the host seat and never a student (utils/practiceSeatStorage,
 * backend/handlers/practiceSeat). The QR and the new-tab link open the same
 * page on a phone or in another tab.
 *
 * Wide screens get the frame beside the board. Phones and portrait tablets get
 * a small card with the QR and link, since a second page squeezed beside the
 * board would be unusable there.
 */
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, ExternalLink, MonitorSmartphone, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { practiceSeatPath } from '@/lib/education/classroomLivePath';
import { NB_BLOCK, NB_PANEL, NB_SMALL, NB_STICKER } from '@/components/teacher/nb/nbStyles';
import type { Translate } from './eduLiveStyles';

interface PracticeRunPanelProps {
  gameCode: string;
  language: string;
  /** The practice seat is in the room. */
  joined: boolean;
  t: Translate;
}

const STEPS = ['step1', 'step2', 'step3', 'step4'] as const;

function useOrigin(): string {
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  return origin;
}

function PhoneJoin({ url, t, compact = false }: { url: string; t: Translate; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0 rounded-neo border-[3px] border-neo-black bg-neo-white p-1 shadow-hard-sm">
        {url ? <QRCodeSVG value={url} size={compact ? 72 : 84} level="M" /> : <span className={cn('block', compact ? 'size-[72px]' : 'size-[84px]')} />}
      </div>
      <div className="min-w-0">
        <p className="font-neo-display text-sm font-black leading-tight">{t('eduLiveRoom.practice.phoneTitle')}</p>
        <p className="mt-0.5 font-neo-body text-xs font-semibold leading-snug text-neo-cream/80">{t('eduLiveRoom.practice.phoneHint')}</p>
      </div>
    </div>
  );
}

export function PracticeRunPanel({ gameCode, language, joined, t }: PracticeRunPanelProps) {
  const [open, setOpen] = useState(true);
  const origin = useOrigin();
  const path = practiceSeatPath(language, gameCode);
  const url = origin ? `${origin}${path}` : '';

  const status = (
    <span data-testid="practice-run-status" className={cn(NB_STICKER, joined ? NB_BLOCK.lime : NB_BLOCK.yellow)}>
      {joined ? <Check className="size-3.5" aria-hidden="true" /> : <span aria-hidden="true" className="size-2 rounded-full bg-neo-black motion-safe:animate-pulse" />}
      {t(joined ? 'eduLiveRoom.practice.joined' : 'eduLiveRoom.practice.joining')}
    </span>
  );

  const openTab = (
    <a href={path} target="_blank" rel="noopener" data-testid="practice-run-open-tab" className={cn(NB_SMALL, NB_BLOCK.cream)}>
      <ExternalLink className="size-4" aria-hidden="true" />
      {t('eduLiveRoom.practice.openTab')}
    </a>
  );

  if (!open) {
    return (
      <button
        type="button"
        data-testid="practice-run-show"
        onClick={() => setOpen(true)}
        className={cn(NB_SMALL, NB_BLOCK.cyan, 'fixed bottom-4 end-4 z-40')}
      >
        <MonitorSmartphone className="size-4" aria-hidden="true" />
        {t('eduLiveRoom.practice.show')}
      </button>
    );
  }

  const hide = (
    <button
      type="button"
      data-testid="practice-run-hide"
      onClick={() => setOpen(false)}
      aria-label={t('eduLiveRoom.practice.hide')}
      title={t('eduLiveRoom.practice.hide')}
      className={cn(NB_SMALL, NB_BLOCK.navy, 'min-w-11 px-0')}
    >
      <X className="size-4" aria-hidden="true" />
    </button>
  );

  return (
    <>
      {/* Wide screens: the student page itself, beside the board. */}
      <aside
        data-testid="practice-run-panel"
        aria-labelledby="practice-run-title"
        className={cn(NB_PANEL, 'm-3 ms-0 hidden w-[min(25rem,32vw)] shrink-0 flex-col gap-3 p-3 lg:flex')}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 id="practice-run-title" className="font-neo-display text-xl font-black leading-tight">{t('eduLiveRoom.practice.title')}</h2>
            <p className="mt-0.5 font-neo-body text-sm font-semibold leading-snug text-neo-cream/80">{t('eduLiveRoom.practice.body')}</p>
          </div>
          {hide}
        </div>
        {status}
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[1.75rem] border-[5px] border-neo-cream bg-neo-navy shadow-hard-lg">
          <iframe
            data-testid="practice-run-frame"
            src={path}
            title={t('eduLiveRoom.practice.frameTitle')}
            allow="clipboard-write"
            className="absolute inset-0 size-full border-0"
          />
        </div>
        <ol className="grid grid-cols-2 gap-1.5">
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-start gap-1.5 font-neo-body text-xs font-bold leading-snug text-neo-cream/85">
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-full border-2 border-neo-black font-neo-display text-[0.7rem] font-black',
                  i === 0 && joined ? 'bg-neo-lime text-neo-black' : 'bg-neo-cream text-neo-black',
                )}
              >
                {i === 0 && joined ? <Check className="size-3" /> : i + 1}
              </span>
              {t(`eduLiveRoom.practice.${step}`)}
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-2 border-t-2 border-dashed border-neo-cream/30 pt-3">
          <PhoneJoin url={url} t={t} />
          <div className="self-start">{openTab}</div>
        </div>
      </aside>

      {/* Phones and portrait tablets: join from this device's other tab or a phone. */}
      <section
        data-testid="practice-run-card"
        aria-labelledby="practice-run-card-title"
        className={cn(NB_PANEL, NB_BLOCK.navy, 'fixed inset-x-3 bottom-3 z-40 flex flex-col gap-2 p-3 sm:start-auto sm:end-4 sm:w-[24rem] lg:hidden')}
      >
        <div className="flex items-start gap-2">
          <h2 id="practice-run-card-title" className="min-w-0 flex-1 font-neo-display text-lg font-black leading-tight">{t('eduLiveRoom.practice.title')}</h2>
          {hide}
        </div>
        {status}
        <PhoneJoin url={url} t={t} compact />
        {openTab}
      </section>
    </>
  );
}

export default PracticeRunPanel;
