'use client';

import { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { modeRoute } from '@/lib/landing/modeMeta';
import { markPromoShown } from '@/lib/landing/promoOverlaySession';
import { NewModesSpotlight } from './NewModesSpotlight';

// v2 key (spotlight redesign): the old text card's marker is set for nearly every
// returning visitor, including those who never actually saw it (see useTopPlayers SSR fix).
const STORAGE_KEY = 'newModesSpotlightSeen';
/**
 * Set when the card is shown, cleared on dismiss: a remount in the same session
 * (hydration regeneration, back-navigation to home) keeps the card instead of
 * reading its own show-time marker as "already seen" and vanishing.
 */
const SESSION_KEY = 'newModesAnnouncementSession';

/**
 * One-time dismissible spotlight for the new game modes (Adventure + Word Tower).
 * Shows only to returning visitors (fresh-new visitors see homeTree only).
 * Mounts exclusively inside ReturningHome, above the `md:hidden`/desktop split.
 *
 * State logic:
 * - Renders null until the `showVisible` effect decides after hydration.
 * - The effect writes the marker + fires `_shown` once, guarded by a ref to prevent
 *   StrictMode double-fire.
 * - Dismiss hides the card (local state) and fires `_dismissed` event.
 *
 * Layout:
 * - Heading + close, then the shared NewModesSpotlight pair (key art, loot chest).
 * - No opacity tween; static appear to avoid Class 5 mobile web flash.
 */
export function NewModesAnnouncement() {
  const { t, language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const hasShownRef = useRef(false);

  // Compute hrefs at the top
  const adventureHref = modeRoute('adventure', language);
  const wtv2Href = modeRoute('wordTowerV2', language);

  // Decoupled effect: decide visibility + write marker + fire event once.
  useEffect(() => {
    // Guard: if either route is unknown (null), bail early from the EFFECT
    // (Rules of Hooks: guard must be inside the effect, not before it)
    if (!adventureHref || !wtv2Href) {
      return;
    }

    if (hasShownRef.current) return; // StrictMode guard: prevent double-fire.

    try {
      if (sessionStorage.getItem(SESSION_KEY)) {
        setIsVisible(true);
        return;
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        // Already seen; stay hidden.
        return;
      }

      // Write marker FIRST. Only show if this succeeds (persist at SHOW time).
      localStorage.setItem(STORAGE_KEY, 'true');
      sessionStorage.setItem(SESSION_KEY, '1');

      // Also gate other promotional overlays at the session level
      markPromoShown();

      // Now that the marker is persisted, show the card.
      setIsVisible(true);
      trackGrowthEvent('new_modes_announcement_shown', {});
      hasShownRef.current = true;
    } catch (err) {
      // localStorage may fail in private mode, etc. Silent fallback (fail-closed).
      console.warn('NewModesAnnouncement: localStorage access failed', err);
    }
  }, [adventureHref, wtv2Href]);

  // Gate the render on isVisible AND hrefs being available
  if (!isVisible || !adventureHref || !wtv2Href) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* private mode: card just stays hidden */ }
    trackGrowthEvent('new_modes_announcement_dismissed', {});
  };

  const handleModeClick = (mode: 'adventure' | 'wordTowerV2') => {
    trackGrowthEvent('new_modes_announcement_clicked', { mode });
  };

  return (
    <section aria-labelledby="new-modes-title" className="relative flex flex-col gap-4 sm:gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="new-modes-title" className="font-neo-display text-2xl font-bold leading-tight text-neo-cream text-balance sm:text-3xl">
            {t('newModes.title')}
          </h2>
          <p className="mt-1 font-neo-body text-sm text-neo-cream/80 sm:text-base">{t('newModes.description')}</p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t('common.close')}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-neo border-3 border-neo-black bg-neo-cream text-neo-black shadow-hard active:translate-y-[2px] active:shadow-hard-pressed focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-cream"
        >
          <X size={18} strokeWidth={3} />
        </button>
      </div>
      <NewModesSpotlight surface="returning" onModeClick={handleModeClick} />
    </section>
  );
}
