'use client';

import { useEffect, useState } from 'react';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { showDay0FirstClassBridge } from '@/lib/education/day0FirstClassBridge';
import { trackFirstRoundGuideShown } from '@/lib/education/firstRoundGuideTelemetry';
import { ResultsTeacherProTrialCard, CLASS_CREATED_TRIAL_PLACEMENT } from '@/components/education/results/ResultsTeacherProTrialCard';
import { FirstClassBridgeCard } from '@/components/education/FirstClassBridgeCard';

export interface ClassCreatedAskProps {
  language: string;
  href: string;
  onStart?: () => void;
  className?: string;
}

/**
 * The ask under a brand-new class. A newly approved teacher on day 0–2 gets
 * the first-class card. Day 3+ and a finished access trial keep the Polar card.
 * While entitlement is loading, render nothing: the Polar card would otherwise
 * count an impression and then get swapped out.
 */
export function ClassCreatedAsk({ language, href, onStart, className }: ClassCreatedAskProps) {
  const { hasPro, loading, known, accessTrialExpires } = useTeacherPro();
  const [nowMs] = useState(() => Date.now());
  const bridge = !loading && known && !hasPro && showDay0FirstClassBridge(accessTrialExpires, nowMs);

  useEffect(() => {
    if (!bridge) return;
    trackFirstRoundGuideShown({ surface: 'class_ready', locale: language, step: 'day0_bridge' });
  }, [bridge, language]);

  if (loading) return null;
  if (bridge) {
    return <FirstClassBridgeCard language={language} href={href} onStart={onStart} className={className} />;
  }
  return (
    <ResultsTeacherProTrialCard
      language={language}
      placement={CLASS_CREATED_TRIAL_PLACEMENT}
      className={className}
    />
  );
}
