'use client';

/**
 * Shows the neutral age gate at the moment an interstitial slot came due but
 * the user's tier is still 'unknown' (AdMobContext.ageGatePromptOpportunity).
 *
 * Why here and not onboarding: the app exited the Families program (13+ Play
 * listing, 2026-06-08) but interstitials remain adult-only per adPolicy — so
 * an undeclared user earns ₪0 from the format. The interstitial slot is a
 * natural break already reserved for an interruption; asking there adds zero
 * new friction, keeps the FTUE ad-free, and a declared 13+ flips the tier to
 * 'adult' live (personalized ads + real interstitials from the next slot).
 *
 * Marker (`lc_age_prompt_shown_at`) is written at SHOW-time, not dismiss-time
 * — reload without dismissing must not re-prompt (Class-1 rule). Dismissing
 * without answering leaves the tier unknown (banners + rewarded keep serving),
 * but does NOT silence the ask forever: while the age stays undeclared we
 * re-prompt at the next slot once RE_PROMPT_INTERVAL_MS has passed. Existing
 * users never reach this — they are grandfathered adult at tier resolution
 * (lib/families/grandfather.ts), so only post-cutoff users are asked.
 */

import { useEffect, useState } from 'react';
import { useAdMobContext } from '@/contexts/AdMobContext';
import { useSocialCapabilities } from '@/hooks/useSocialCapabilities';
import { AgeGateModal } from '@/components/families/AgeGateModal';
import { trackAgeGate } from '@/utils/growthTracking';

const MARKER_KEY = 'lc_age_prompt_shown_at';

/** While unanswered, ask again at a slot no sooner than every 14 days. */
export const RE_PROMPT_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000;

/** True while the last prompt is recent enough that we must stay quiet. */
function recentlyPrompted(): boolean {
  try {
    const raw = localStorage.getItem(MARKER_KEY);
    if (raw == null) return false;
    const shownAt = Number(raw);
    // Unparsable marker = treat as stale, ask again (never silence forever).
    if (!Number.isFinite(shownAt)) return false;
    return Date.now() - shownAt < RE_PROMPT_INTERVAL_MS;
  } catch {
    return true; // storage unavailable — fail closed, never nag
  }
}

export default function AgeGatePromptWrapper() {
  const { ageGatePromptOpportunity } = useAdMobContext();
  const { needsAgeGate, authResolved } = useSocialCapabilities();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done || open) return;
    // authResolved gate: tier reads 'unknown' while auth is still loading — a
    // logged-in adult must not get flashed the prompt during that window.
    if (!ageGatePromptOpportunity || !needsAgeGate || !authResolved) return;
    if (recentlyPrompted()) {
      setDone(true);
      return;
    }
    try {
      localStorage.setItem(MARKER_KEY, String(Date.now()));
    } catch {
      // storage write failed — still show this once; worst case is a re-ask
    }
    trackAgeGate('shown');
    setOpen(true);
  }, [ageGatePromptOpportunity, needsAgeGate, authResolved, done, open]);

  if (!open) return null;

  const close = () => {
    setOpen(false);
    setDone(true);
  };

  return (
    <AgeGateModal
      isOpen
      onResolved={() => {
        trackAgeGate('declared');
        close();
      }}
      onClose={() => {
        trackAgeGate('dismissed');
        close();
      }}
    />
  );
}
