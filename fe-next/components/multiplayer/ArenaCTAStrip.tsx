'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Zap, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader } from '@/components/ui/Loader';
import { useNetworkState } from '@/hooks/useNetworkState';

const stripVariants = {
  hidden: { y: -15, opacity: 0, scale: 0.95 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 22, delay: 0.1 },
  },
};

interface ArenaCTAStripProps {
  onQuickPlay: () => void;
  onCreateRoom: () => void;
  isQuickPlayLoading?: boolean;
  /** Skips entrance animation when the parent already mounted (prevents re-entrance on prop churn). */
  skipEnterAnimation?: boolean;
}

const ArenaCTAStrip: React.FC<ArenaCTAStripProps> = ({
  onQuickPlay,
  onCreateRoom,
  isQuickPlayLoading = false,
  skipEnterAnimation = false,
}) => {
  const { t } = useLanguage();
  const { online } = useNetworkState();

  // A replayed session showed the app rendering its "Offline" badge while both
  // of these buttons stayed bright, enabled and inviting — the player tapped a
  // CTA the app already knew could not work, then rage-clicked and left.
  // Scope: this covers the DEVICE-offline case, which is what the replay
  // showed. The dead-socket-while-online case is handled inside
  // useMultiplayerJoin (pending state up front, explicit reconnect, 12s wait)
  // rather than here — reading socket context from this leaf would make it
  // unrenderable outside a SocketProvider, which its own tests caught.
  // See docs/onboarding/2026-08-07-onboarding-friction-audit.md.
  const isUnavailable = !online;
  const quickPlayDisabled = isQuickPlayLoading || isUnavailable;
  const quickPlayLabel = isUnavailable
    ? t('mp.quality.reconnecting')
    : t('multiplayerFlow.roomList.quickStart');

  return (
    <m.section
      data-testid="arena-cta-strip"
      variants={stripVariants}
      initial={skipEnterAnimation ? false : 'hidden'}
      animate="visible"
      className="flex flex-col sm:flex-row gap-2.5"
    >
      {/* Primary action — instant matchmaking. Bumped to the clear hero:
          larger min-height, an icon chip for weight, and a lift-on-hover so it
          reads as the obvious first move. */}
      <m.button
        type="button"
        data-testid="arena-quick-start"
        onClick={onQuickPlay}
        disabled={quickPlayDisabled}
        aria-label={quickPlayLabel}
        aria-busy={isUnavailable || undefined}
        whileHover={{ scale: 1.02, transition: { type: 'spring' as const, stiffness: 400, damping: 20 } }}
        whileTap={{ scale: 0.97 }}
        className="flex-2 min-h-[56px] py-3 px-4 flex items-center justify-center gap-3 bg-neo-lime border-3 border-neo-black rounded-xl shadow-hard hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-hard-pressed disabled:hover:shadow-hard-pressed focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan"
      >
        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-neo-black/15 border-2 border-neo-black/25 shrink-0">
          {isQuickPlayLoading || isUnavailable ? (
            <Loader size="sm" />
          ) : (
            <Zap className="w-5 h-5 text-neo-black" />
          )}
        </span>
        <span className="text-neo-black font-black text-lg sm:text-xl uppercase tracking-tight">
          {quickPlayLabel}
        </span>
      </m.button>

      {/* Secondary action — create a private room. Visibly subordinate:
          dark fill, pink outline that warms on hover. */}
      <m.button
        type="button"
        data-testid="arena-create-room"
        onClick={onCreateRoom}
        disabled={isUnavailable}
        aria-label={t('multiplayerFlow.roomList.createPrivateBattle')}
        whileHover={{ scale: 1.02, transition: { type: 'spring' as const, stiffness: 400, damping: 20 } }}
        whileTap={{ scale: 0.97 }}
        className="flex-1 min-h-[48px] py-3 px-4 flex items-center justify-center gap-2 bg-neo-navy-light border-3 border-neo-pink/50 rounded-xl shadow-hard-sm hover:border-neo-pink hover:bg-neo-navy-light/70 active:translate-y-0.5 active:shadow-hard-pressed transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:border-neo-pink/50 disabled:hover:bg-neo-navy-light focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
      >
        <Users className="w-4 h-4 text-neo-pink shrink-0" />
        <span className="text-neo-pink font-black text-sm uppercase tracking-wide whitespace-nowrap">
          {t('multiplayerFlow.roomList.createPrivateBattle')}
        </span>
      </m.button>
    </m.section>
  );
};

export default ArenaCTAStrip;
