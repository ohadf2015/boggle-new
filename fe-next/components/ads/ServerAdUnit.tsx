/**
 * Server-compatible AdSense ad unit for Server Components.
 *
 * Unlike AdUnit (client component), this renders the <ins> tag server-side
 * and defers the adsbygoogle.push() call to a minimal inline script.
 * Use this in RSC pages like /words/* where useEffect is unavailable.
 *
 * Security: The inline script contains only a static string constant —
 * no user input is interpolated. This is the standard AdSense activation pattern.
 */

import { ADSENSE_PUBLISHER_ID } from '@/lib/adsense';
import { AD_SLOTS, type AdSlotKey } from '@/lib/adSlots';

interface ServerAdUnitProps {
  /** Which slot to render */
  slot: AdSlotKey;
  /** Extra CSS class on wrapper */
  className?: string;
}

/**
 * Static script content — activates the AdSense ad slot.
 * This is a constant string with no dynamic content, safe for dangerouslySetInnerHTML.
 */
const ADSENSE_PUSH_SCRIPT = `try{(window.adsbygoogle=window.adsbygoogle||[]).push({})}catch(e){}`;

export function ServerAdUnit({ slot, className }: ServerAdUnitProps) {
  const adSlot = AD_SLOTS[slot];

  return (
    <aside
      className={`ad-unit flex justify-center ${className ?? ''}`}
      aria-label="Advertisement"
      role="complementary"
    >
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_PUBLISHER_ID}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      {/* Static constant — no user input involved (same pattern as GoogleAdSense.tsx) */}
      <script
        dangerouslySetInnerHTML={{ __html: ADSENSE_PUSH_SCRIPT }}
      />
    </aside>
  );
}
