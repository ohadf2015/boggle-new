'use client';

/**
 * useConsentDecided — reactive flag for whether the user has made a cookie-consent decision.
 *
 * Why this exists: engagement modals (signup prompt, email capture, push prompt) auto-open
 * on a timer. The cookie-consent banner sits at z-110 with no backdrop; those modals live at
 * z-90/z-50. If one opens while consent is still pending, it renders *behind* the banner and
 * gets "revealed" the moment the user clicks Decline/Accept — looking like a modal popped open
 * in the background. Gating their open-effects on this flag holds them until consent is
 * resolved (also the GDPR-correct ordering: settle consent before marketing prompts).
 *
 * The flag returns true once any decision exists and flips back to false if consent is reset.
 */

import { useEffect, useState } from 'react';
import { hasConsentDecision, onConsentChange } from '@/utils/cookieConsent';

export function useConsentDecided(): boolean {
  // Initialised from the real value on the client (false during SSR, since
  // hasConsentDecision() guards on `window`). This is safe against hydration mismatch
  // ONLY because every consumer gates an *effect* on this flag, never SSR'd markup — a
  // server/client divergence here can't produce mismatched HTML. Do NOT "fix" this into a
  // useEffect-only set: that reintroduces a first-paint race where a modal timer can start
  // before the gate is read.
  const [decided, setDecided] = useState<boolean>(() => hasConsentDecision());

  useEffect(() => {
    // Re-sync in case consent changed between the initial render and effect mount.
    setDecided(hasConsentDecision());
    return onConsentChange(() => setDecided(hasConsentDecision()));
  }, []);

  return decided;
}
