'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { modeRoute } from '@/lib/landing/modeMeta';
import { markPromoShown } from '@/lib/landing/promoOverlaySession';

const STORAGE_KEY = 'newModesAnnouncementSeen';

/**
 * One-time dismissible announcement card for the new game modes (Adventure + Word Tower V2).
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
 * - Fixed card above bottom nav (with logical spacing for RTL).
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
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        // Already seen; stay hidden.
        return;
      }

      // Write marker FIRST. Only show if this succeeds (persist at SHOW time).
      localStorage.setItem(STORAGE_KEY, 'true');

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
    trackGrowthEvent('new_modes_announcement_dismissed', {});
  };

  const handleModeClick = (mode: 'adventure' | 'wordTowerV2') => {
    trackGrowthEvent('new_modes_announcement_clicked', { mode });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-3 lg:px-6 xl:px-8 py-2">
      {/* Fixed card anchored above bottom nav, static appear (no tween) */}
      <div
        className="relative rounded-neo border border-neo-cream dark:border-neo-cream/30 bg-neo-navy dark:bg-neo-navy-darker shadow-neo-hard p-4 sm:p-5"
        style={{
          /* logical spacing for RTL */
          paddingInlineEnd: 'calc(var(--radius-size, 4px) + 0.5rem)',
        }}
      >
        {/* Close button — positioned top-right (logical end) */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 end-3 p-1.5 hover:opacity-70 transition-opacity"
          aria-label={t('common.close')}
        >
          <X size={20} className="text-neo-cream" />
        </button>

        {/* Announcement content */}
        <div className="pe-8">
          <h3 className="text-base font-bold text-neo-cream mb-2">
            {t('newModes.title')}
          </h3>
          <p className="text-sm text-neo-cream/80 mb-4">
            {t('newModes.description')}
          </p>

          {/* Two CTA buttons */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={adventureHref}
              onClick={() => handleModeClick('adventure')}
              className="flex-1 px-3 py-2 rounded-neo bg-lime-400 text-neo-navy font-bold text-center hover:opacity-85 transition-opacity text-sm"
            >
              {t('newModes.playAdventure')}
            </Link>
            <Link
              href={wtv2Href}
              onClick={() => handleModeClick('wordTowerV2')}
              className="flex-1 px-3 py-2 rounded-neo bg-purple-400 text-neo-navy font-bold text-center hover:opacity-85 transition-opacity text-sm"
            >
              {t('newModes.playWordTower')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
