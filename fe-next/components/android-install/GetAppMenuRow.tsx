'use client';

/**
 * GetAppMenuRow — the DURABLE re-entry surface for the Android app install.
 *
 * Unlike the session pill (which a reload clears), this lives in the header
 * drawer menu, so it's a permanent, discoverable way to reopen the install
 * promo no matter how many times the popup was dismissed. It bypasses the
 * 14-day cooldown because tapping it is an explicit, user-initiated request.
 *
 * Renders wherever installing the native Android app is possible — desktop and
 * Android / other mobile browsers — and returns null on iOS / the native shell /
 * an installed PWA, so it never clutters the menu for users who can't act on it.
 */

import { useMemo } from 'react';
import { Smartphone } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAndroidInstallStore } from '@/lib/androidInstall/androidInstallStore';
import { isAndroidInstallEntryEligible } from '@/lib/androidInstall/installEligibility';
import { isCapacitorNative, isStandaloneDisplay } from '@/utils/androidApp';
import { trackInstallMenuClick, type MenuRowSource } from '@/lib/androidInstall/installTracking';

interface GetAppMenuRowProps {
  onNavigate?: () => void;
  /**
   * Which placement this row is. `menu` (default) is the header drawer;
   * `results` is the post-game screen, where intent is far higher. Both the
   * click event and the promo modal it opens are tagged with it, so the two
   * placements never share a funnel.
   */
  source?: MenuRowSource;
}

export default function GetAppMenuRow({ onNavigate, source = 'menu' }: GetAppMenuRowProps) {
  const { t } = useLanguage();
  const openPromo = useAndroidInstallStore((s) => s.openPromo);

  const eligible = useMemo(
    () =>
      typeof navigator !== 'undefined' &&
      isAndroidInstallEntryEligible({
        ua: navigator.userAgent,
        isCapacitorNative: isCapacitorNative(),
        isStandalone: isStandaloneDisplay(),
      }),
    []
  );

  if (!eligible) return null;

  const handleClick = () => {
    trackInstallMenuClick(source);
    onNavigate?.();
    openPromo(source);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="relative flex w-full items-center gap-3 rounded-neo border-3 border-neo-black bg-neo-lime px-4 py-3 text-sm font-bold text-neo-black shadow-hard-sm transition-all duration-100 hover:-translate-y-px hover:shadow-hard active:translate-y-px active:shadow-none"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-neo border-3 border-neo-black/30 bg-neo-black/15">
        <Smartphone className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
      </span>
      <span>{t('androidAppPromo.menuLabel')}</span>
    </button>
  );
}
