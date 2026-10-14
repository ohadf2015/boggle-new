/**
 * Inline RUM beacon for the <head>.
 *
 * Fires before React/Vite/PostHog load, so abandoned cold starts are still
 * captured. Sends a `page_cold_start` event to PostHog with TTFB, path and
 * the country code the server was able to resolve from CDN headers.
 *
 * Once per device per UTC day: the script re-runs on every full document load
 * (reload, back/forward, the chunk-boot-guard self-heal), and counting those
 * as cold starts put the event 40x above every other event in PostHog. The
 * first guard was per-session (sessionStorage `lc_rum_fired`), but every new
 * tab, PWA relaunch or native WebView process restart is a new session, so
 * identified users still averaged ~1.7 events/day. A localStorage day bucket
 * (`lc_rum_day`) survives all of those; the sessionStorage flag stays as a
 * fast path for reloads in contexts where localStorage is blocked but
 * sessionStorage works. Blocked-storage contexts (Safari private, sandboxed
 * webviews) still send — every storage read/write sits in its own try/catch.
 */

export function getRumBeaconScript(countryCode: string, postHogKey: string): string {
  if (!postHogKey) return '';

  return `
(function(){
  try {
    var today = new Date().toISOString().slice(0, 10);
    try {
      if (sessionStorage.getItem('lc_rum_fired')) return;
      if (localStorage.getItem('lc_rum_day') === today) return;
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
        $lib_version: '1.1.0'
      }
    });
    var url = 'https://eu.i.posthog.com/capture/';
    var blob = new Blob([body], { type: 'application/json' });
    try {
      sessionStorage.setItem('lc_rum_fired', '1');
    } catch (e) {}
    try {
      localStorage.setItem('lc_rum_day', today);
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
