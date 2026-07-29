'use client';

import { useState } from 'react';
import { Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBoostStatus } from '@/hooks/useBoostStatus';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { BoostPicker } from './BoostPicker';

interface Props {
  mode: 'mp' | 'sp' | 'drill' | 'classic';
  sessionId: string;
  disabled?: boolean;
  /**
   * Controlled-mode props — when both provided, the button delegates picker open
   * state to the parent (used by host pre-game to keep a single picker across
   * mobile/desktop layout trees that mount/unmount on viewport change).
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function BoostButton({ mode, sessionId, disabled, open: openProp, onOpenChange }: Props) {
  const { t } = useLanguage();
  const { status } = useBoostStatus();
  const { canShowAd } = useRewardedAd({ rewardKind: 'feature' });
  const [openSelf, setOpenSelf] = useState(false);

  const isControlled = openProp !== undefined && onOpenChange !== undefined;
  const open = isControlled ? !!openProp : openSelf;
  const setOpen = isControlled ? onOpenChange : setOpenSelf;

  // Hide entirely when no ad provider is available (web without CrazyGames)
  // or daily ad limit reached. Boost requires a watched ad — showing a
  // disabled button leaves the user wondering why they can't claim.
  if (!canShowAd) return null;

  // Floor at 0 — a stale/buggy server response with a negative count would
  // otherwise produce a confusing aria announcement like "open picker, -5
  // boosts remaining" (audit UX-LOW).
  const remaining = Math.max(0, status?.remaining ?? 0);
  const isDisabled = disabled || remaining === 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={isDisabled}
        aria-label={t('boosts.openPickerAria', { n: remaining })}
        className="inline-flex items-center gap-2 rounded-neo border-neo bg-neo-pink px-4 py-2 font-neo-display text-neo-white shadow-hard hover:active:shadow-hard-pressed disabled:opacity-50"
      >
        <Zap data-boost-button-icon aria-hidden="true" className="h-5 w-5" strokeWidth={2.75} />
        <span>{t('boosts.cta')}</span>
        <span className="rounded-full border-neo bg-neo-cream px-1.5 py-0 text-xs font-bold text-neo-navy">{remaining}</span>
      </button>
      {/* Render picker only when uncontrolled. In controlled mode the parent
          renders BoostPicker once at top level so picker state survives layout
          tree swaps (mobile↔desktop on rotate). */}
      {!isControlled && open && (
        <BoostPicker open={open} mode={mode} sessionId={sessionId} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
