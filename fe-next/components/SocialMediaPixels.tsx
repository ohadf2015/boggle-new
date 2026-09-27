'use client';

import Script from 'next/script';

const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

/**
 * Social Media Pixels Component
 *
 * Includes Facebook Pixel and TikTok Pixel for conversion tracking and retargeting.
 * Add NEXT_PUBLIC_FB_PIXEL_ID and NEXT_PUBLIC_TIKTOK_PIXEL_ID to environment variables.
 */
export function SocialMediaPixels() {
  return (
    <>
      {/* Facebook Pixel */}
      {FB_PIXEL_ID && (
        <>
          <Script id="facebook-pixel" strategy="lazyOnload">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${FB_PIXEL_ID}');
              fbq('track', 'PageView');
            `}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {/* TikTok Pixel */}
      {TIKTOK_PIXEL_ID && (
        <Script id="tiktok-pixel" strategy="lazyOnload">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};

              ttq.load('${TIKTOK_PIXEL_ID}');
              ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
      )}
    </>
  );
}

/**
 * Track Facebook Pixel custom events
 */
export function trackFBEvent(
  eventName: string,
  eventParams?: Record<string, string | number | boolean>
): void {
  if (typeof window !== 'undefined' && 'fbq' in window && FB_PIXEL_ID) {
    (window as typeof window & { fbq: (...args: unknown[]) => void }).fbq('track', eventName, eventParams);
  }
}

/**
 * Track TikTok Pixel custom events
 */
export function trackTikTokEvent(
  eventName: string,
  eventParams?: Record<string, string | number | boolean>
): void {
  if (typeof window !== 'undefined' && 'ttq' in window && TIKTOK_PIXEL_ID) {
    (window as typeof window & { ttq: { track: (...args: unknown[]) => void } }).ttq.track(eventName, eventParams);
  }
}

/**
 * Helper functions for common social media conversion events
 */
export const socialEvents = {
  /** Track when user completes signup */
  completeRegistration: (userId?: string) => {
    const params = userId ? { user_id: userId } : undefined;
    trackFBEvent('CompleteRegistration', params);
    trackTikTokEvent('CompleteRegistration', params);
  },

  /** Track when user starts playing a game */
  gameStarted: (gameMode: string) => {
    trackFBEvent('StartTrial', { content_name: gameMode });
    trackTikTokEvent('ClickButton', { content_name: 'game_start', game_mode: gameMode });
  },

  /** Track when user shares content */
  shareContent: (contentType: 'room' | 'score' | 'achievement', method: string) => {
    trackFBEvent('Share', { content_type: contentType, method: method });
    trackTikTokEvent('Share', { content_type: contentType, method: method });
  },

  /** Track when user achieves something significant */
  achievementUnlocked: (achievementName: string) => {
    trackFBEvent('AchievementUnlocked', { achievement_id: achievementName });
    trackTikTokEvent('AchievementUnlocked', { achievement_id: achievementName });
  },

  /** Track when user views specific content */
  viewContent: (contentType: string, contentId?: string) => {
    const fbParams: Record<string, string | number | boolean> = { content_type: contentType };
    if (contentId) fbParams.content_ids = contentId;
    trackFBEvent('ViewContent', fbParams);
    const ttParams: Record<string, string | number | boolean> = { content_type: contentType };
    if (contentId) ttParams.content_id = contentId;
    trackTikTokEvent('ViewContent', ttParams);
  },

  /** Track when user adds friend or invites */
  addToWishlist: (itemName: string) => {
    trackFBEvent('AddToWishlist', { content_name: itemName });
    trackTikTokEvent('AddToWishlist', { content_name: itemName });
  },
};

export default SocialMediaPixels;
