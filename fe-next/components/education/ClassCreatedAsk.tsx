'use client';

import { useEffect, useState } from 'react';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { showDay0FirstClassBridge } from '@/lib/education/day0FirstClassBridge';
import { trackFirstRoundGuideShown } from '@/lib/education/firstRoundGuideTelemetry';
import { FirstClassBridgeCard } from '@/components/education/FirstClassBridgeCard';

export interface ClassCreatedAskProps {
  language: string;
  href: string;
  onStart?: () => void;
  className?: string;
}

/**
 * The ask under a brand-new class. A newly approved teacher on day 0–2 gets
 * the first-class card. The class-created screen carries no Pro offer at all
 * (invariant pinned by ClassSetupInvite.test.tsx), so day 3+ and a finished
 * access trial render nothing here.
 */
export function ClassCreatedAsk({ language, href, onStart, className }: ClassCreatedAskProps) {
  const { hasPro, loading, known, accessTrialExpires } = useTeacherPro();
  const [nowMs] = useState(() => Date.now());
  const bridge = !loading && known && !hasPro && showDay0FirstClassBridge(accessTrialExpires, nowMs);

  useEffect(() => {
    if (!bridge) return;
    trackFirstRoundGuideShown({ surface: 'class_ready', locale: language, step: 'day0_bridge' });
  }, [bridge, language]);

  if (!bridge) return null;
  return <FirstClassBridgeCard language={language} href={href} onStart={onStart} className={className} />;
}
