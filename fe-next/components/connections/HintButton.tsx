'use client';

import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { Lightbulb, Play, Loader2, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useExperiment } from '@/hooks/useExperiment';
import { useRewardedFeatureUnlock } from '@/hooks/useRewardedFeatureUnlock';
import { freeHintsRemaining, consumeFreeHint } from '@/lib/connections/freeHints';

interface HintButtonProps {
  hasHint: boolean;
  hintRevealed: boolean;
  isAdmin: boolean;
  disabled: boolean;
  wrongAttempts: number;
  onRevealHint: () => void;
  adContext: Record<string, unknown>;
}

const HINT_BTN =
  'inline-flex h-9 items-center gap-1.5 rounded-full border-2 border-neo-black bg-neo-yellow px-3.5 font-neo-display text-sm font-black text-neo-navy shadow-hard-sm transition-[transform,box-shadow] duration-100 active:translate-y-px active:shadow-hard-pressed disabled:opacity-60';

/** One free hint a day; after that a short rewarded ad (native AdMob or the web provider). */
export default function HintButton({
  hasHint,
  hintRevealed,
  isAdmin,
  disabled,
  wrongAttempts,
  onRevealHint,
  adContext,
}: HintButtonProps) {
  const { t } = useLanguage();
  const [freeHints, setFreeHints] = useState(() => freeHintsRemaining());
  const ad = useRewardedFeatureUnlock({
    placement: 'connections_reveal_hint',
    surface: 'hint',
    onUnlock: onRevealHint,
    disabled: isAdmin || hintRevealed || disabled || !hasHint,
    context: adContext,
  });
  const { variant, trackExposure } = useExperiment('exp-connections-hint-gate-v1');
  const showFallbackHint = variant === 'after-3-wrong' && wrongAttempts >= 3 && !isAdmin;
  useEffect(() => {
    if (showFallbackHint && hasHint && !hintRevealed) trackExposure();
  }, [showFallbackHint, hasHint, hintRevealed, trackExposure]);

  if (!hasHint || hintRevealed) return null;

  if (isAdmin || freeHints > 0) {
    return (
      <m.button
        type="button"
        data-testid="hint-free"
        onClick={() => {
          if (!isAdmin) setFreeHints(consumeFreeHint());
          onRevealHint();
        }}
        disabled={disabled}
        whileTap={{ scale: 0.95 }}
        className={HINT_BTN}
      >
        <Lightbulb className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />
        {isAdmin ? t('connections.revealHint') : t('connections.freeHint', { count: freeHints })}
      </m.button>
    );
  }

  if (ad.canShowAd) {
    const busy = ad.status === 'loading' || ad.status === 'showing';
    return (
      <m.button
        type="button"
        data-testid="hint-ad"
        onClick={ad.offer}
        disabled={disabled || busy}
        whileTap={{ scale: 0.95 }}
        className={HINT_BTN}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Play className="h-4 w-4 fill-neo-navy" strokeWidth={2.75} aria-hidden="true" />
        )}
        {t('connections.revealHintAd')}
      </m.button>
    );
  }

  if (showFallbackHint) {
    return (
      <m.button type="button" onClick={onRevealHint} disabled={disabled} whileTap={{ scale: 0.95 }} className={HINT_BTN}>
        <Lightbulb className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />
        {t('connections.revealHint')}
      </m.button>
    );
  }

  return (
    <span
      data-testid="hint-tomorrow"
      className="inline-flex h-9 items-center gap-1.5 rounded-full border-2 border-neo-cream/40 px-3 font-neo-body text-xs font-bold text-neo-white/70"
    >
      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      {t('connections.hintTomorrow')}
    </span>
  );
}
