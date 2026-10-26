'use client';
import { useEffect, useRef, type RefObject } from 'react';
import { trackGrowthEvent } from '@/utils/growthTracking';

export type UpsellImpression = { cta: string; placement: string };

/**
 * Fire `education_upsell_impression` once, when at least half of `ref` is on
 * screen (immediately when IntersectionObserver is missing). Same semantics as
 * TeacherAccessCTA / DistrictUpsellStrip, which were the only emitters until the
 * Oct 2026 /education landing redesign replaced them with ProFramingSection +
 * LandingSchoolLead — leaving the hub (the biggest education entry) with no
 * impression at all. Pass `null` to opt out.
 *
 * `onSeen` runs once, right after the impression fires: the hook for a
 * cookie-independent server twin (browser PostHog is consent-gated).
 */
export function useUpsellImpression(
  ref: RefObject<Element | null>,
  impression: UpsellImpression | null | undefined,
  extra?: Record<string, unknown>,
  onSeen?: () => void,
): void {
  const firedRef = useRef(false);
  const cta = impression?.cta;
  const placement = impression?.placement;
  const extraRef = useRef(extra);
  extraRef.current = extra;
  const onSeenRef = useRef(onSeen);
  onSeenRef.current = onSeen;

  useEffect(() => {
    if (!cta || !placement || firedRef.current) return;
    const el = ref.current;
    if (!el) return;
    const fire = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      try {
        trackGrowthEvent('education_upsell_impression', { cta, placement, ...(extraRef.current ?? {}) });
      } catch {
        /* analytics must never block */
      }
      try {
        onSeenRef.current?.();
      } catch {
        /* analytics must never block */
      }
    };
    if (typeof IntersectionObserver === 'undefined') {
      fire();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && (entry.intersectionRatio === undefined || entry.intersectionRatio >= 0.5)) {
            io.disconnect();
            fire();
            break;
          }
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, cta, placement]);
}
