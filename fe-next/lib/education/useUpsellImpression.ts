'use client';
import { useEffect, useRef, type RefObject } from 'react';
import { trackGrowthEvent } from '@/utils/growthTracking';

export type UpsellImpression = { cta: string; placement: string };

/**
 * Fire `education_upsell_impression` once, when at least half of `ref` is on
 * screen (immediately when IntersectionObserver is missing). Same semantics as
 * TeacherAccessCTA / DistrictUpsellStrip, which were the only emitters until the
 * Oct 2026 / education landing redesign replaced them with ProFramingSection +
 * LandingSchoolLead — leaving the hub (the biggest education entry) with no
 * impression at all. Pass `null` to opt out.
 *
 * If the element is not in the DOM on the first effect (ref still null), we
 * retry on animation frames until it is, or the hook unmounts. A one-shot
 * observe() that bailed on a null ref never saw later placements.
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
    let cancelled = false;
    let io: IntersectionObserver | null = null;
    let raf = 0;
    const fire = () => {
      if (firedRef.current || cancelled) return;
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
    const seen = (entry: { isIntersecting: boolean; intersectionRatio: number }) =>
      entry.isIntersecting && (entry.intersectionRatio === undefined || entry.intersectionRatio >= 0.5);
    const attach = () => {
      if (cancelled || firedRef.current) return;
      const el = ref.current;
      if (!el) {
        raf = requestAnimationFrame(attach);
        return;
      }
      if (typeof IntersectionObserver === 'undefined') {
        fire();
        return;
      }
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (seen(entry)) {
              io?.disconnect();
              fire();
              break;
            }
          }
        },
        // 0 and 1 catch a zero-height first layout that later grows into view;
        // 0.5 is the "at least half on screen" bar.
        { threshold: [0, 0.5, 1] },
      );
      io.observe(el);
    };
    attach();
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      io?.disconnect();
    };
  }, [ref, cta, placement]);
}
