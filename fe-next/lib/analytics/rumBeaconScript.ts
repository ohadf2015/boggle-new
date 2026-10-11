/**
 * Inline RUM beacon for the <head>.
 *
 * Fires before React/Vite/PostHog load, so abandoned cold starts are still
 * captured. Sends a `page_cold_start` event to PostHog with TTFB, path and
 * the country code the server was able to resolve from CDN headers.
 *
 * Once per browser session: the script re-runs on every full document load
 * (reload, back/forward, the chunk-boot-guard self-heal), and counting those
 * as cold starts put the event 40x above every other event in PostHog.
 */

export function getRumBeaconScript(countryCode: string, postHogKey: string): string {
  if (!postHogKey) return '';

  return `
(function(){
  try {
    try {
      if (sessionStorage.getItem('lc_rum_fired')) return;
    } catch (e) {}
    var nav = performance.getEntriesByType('navigation')[0];
    var ttfb = nav && nav.responseStart ? Math.round(nav.responseStart) : 0;
    var did = '';
    try {
      did = sessionStorage.getItem('lc_rum_id') || localStorage.getItem('lc_rum_id');
    } catch (e) {}
    if (!did) {
      did = (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'rum-' + Date.now() + '-' + Math.random().toString(36).slice(2));
      try {
        sessionStorage.setItem('lc_rum_id', did);
      } catch (e) {}
    }
    var body = JSON.stringify({
      api_key: ${JSON.stringify(postHogKey)},
      distinct_id: did,
      event: 'page_cold_start',
      properties: {
        ttfb_ms: ttfb,
        path: typeof location !== 'undefined' ? location.pathname : '',
        country: ${JSON.stringify(countryCode)},
        $host: typeof location !== 'undefined' ? location.hostname : '',
        $current_url: typeof location !== 'undefined' ? location.href : '',
        $lib: 'rum-inline',
        $lib_version: '1.0.0'
      }
    });
    var url = 'https://eu.i.posthog.com/capture/';
    var blob = new Blob([body], { type: 'application/json' });
    try {
      sessionStorage.setItem('lc_rum_fired', '1');
    } catch (e) {}
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(url, blob);
    } else if (typeof fetch !== 'undefined') {
      fetch(url, {
        method: 'POST',
        body: body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true
      }).catch(function() {});
    }
  } catch (e) {}
})();
`.trim();
}
