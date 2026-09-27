'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNetworkState } from '@/hooks/useNetworkState';
import { MpPrimaryCta } from '@/components/multiplayer/shell/MpPrimaryCta';
import { CtaGlint } from '@/components/multiplayer/entry/CtaGlint';

interface ArenaCTAStripProps {
  onQuickPlay: () => void;
  onCreateRoom: () => void;
  isQuickPlayLoading?: boolean;
}

/**
 * The entry footer (DESIGN §b.1): [QUICK START lime, 2/3] [CREATE pink outline,
 * 1/3] on phone. From `lg` CREATE lives in the left column, so the footer is
 * QUICK START alone, centred at 480px (×1.5 on TV). One primary per footer.
 *
 * Offline guard (onboarding friction audit 2026-08-07): when the DEVICE is
 * offline both CTAs go inert and QUICK START says it is reconnecting — a replay
 * showed players rage-clicking bright buttons the app already knew could not
 * work. The dead-socket-while-online case is handled in useMultiplayerJoin.
 * Painted statically (no opacity entrance): the footer is above the fold.
 */
const ArenaCTAStrip: React.FC<ArenaCTAStripProps> = ({ onQuickPlay, onCreateRoom, isQuickPlayLoading = false }) => {
  const { t } = useLanguage();
  const { online } = useNetworkState();
  const offline = !online;

  return (
    <section
      data-testid="arena-cta-strip"
      className="border-t-2 border-neo-black/70 bg-neo-navy px-4 pt-3 pb-3 lg:pb-5 tv:pb-8"
    >
      <div data-cta-row="" className="mx-auto flex w-full max-w-xl items-stretch gap-3 lg:max-w-[calc(480px*var(--mp-u,1))]">
        <div className="relative flex-[2] min-w-0">
          <MpPrimaryCta
            tone="lime"
            testId="arena-quick-start"
            label={offline ? t('mp.quality.reconnecting') : t('multiplayerFlow.roomList.quickStart')}
            onPress={onQuickPlay}
            disabled={offline}
            loading={isQuickPlayLoading && !offline}
            className="shadow-hard-lg"
          />
          {/* One glint once the entry has painted: the eye lands on the primary. */}
          <CtaGlint delayMs={900} />
        </div>
        <button
          type="button"
          data-testid="arena-create-room"
          onClick={offline ? undefined : onCreateRoom}
          disabled={offline}
          className="lg:hidden flex-1 min-w-0 h-[calc(64px*var(--mp-u,1))] flex flex-col items-center justify-center gap-0.5 rounded-neo border-3 border-neo-pink bg-neo-navy-light px-2 font-neo-display text-xs font-bold uppercase leading-tight text-neo-pink shadow-hard transition-transform duration-100 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
        >
          <Plus aria-hidden="true" className="h-5 w-5 shrink-0" />
          {/* 1/3 of a 390px row is ~93px — too narrow for "CREATE ROOM" on one
              line. Wrap to two centred lines (still fits the 64px button under
              the icon); never truncate the label into "CREAT…". */}
          <span className="max-w-full text-center text-balance">{t('mpUi.entry.create')}</span>
        </button>
      </div>
    </section>
  );
};

export default ArenaCTAStrip;
