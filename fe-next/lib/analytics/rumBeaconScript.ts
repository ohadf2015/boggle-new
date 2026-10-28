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
 *
 * Education lander CTA clicks are a second, aggregate event (`lander_cta_clicked`).
 * That listener is installed before the cold-start guard returns, uses a
 * throwaway distinct_id, and writes nothing to storage — no person id, no cookie.
 */

import { EDUCATION_LANDER_RE_SOURCE } from './landerCta';

export function getRumBeaconScript(countryCode: string, postHogKey: string): string {
  if (!postHogKey) return '';

  return `
(function(){
  try {
    try {
      if (!window.__lcLanderCta) {
        window.__lcLanderCta = 1;
        var landerRe = new RegExp(${JSON.stringify(EDUCATION_LANDER_RE_SOURCE)}, 'i');
        document.addEventListener('click', function(ev) {
          try {
            if (!landerRe.test(location.pathname || '')) return;
            var node = ev.target;
            if (node && node.nodeType === 3) node = node.parentElement;
            var el = node && node.closest ? node.closest('[data-lc-cta]') : null;
            if (!el) return;
            var cta = el.getAttribute('data-lc-cta') || '';
            if (!cta) return;
            var q = new URLSearchParams(location.search || '');
            var clip = function(v) { return String(v || '').trim().slice(0, 200); };
            var did = (typeof crypto !== 'undefined' && crypto.randomUUID)
              ? crypto.randomUUID()
              : 'cta-' + Date.now() + '-' + Math.random().toString(36).slice(2);
            var ctaBody = JSON.stringify({
              api_key: ${JSON.stringify(postHogKey)},
              distinct_id: did,
              event: 'lander_cta_clicked',
              properties: {
                path: location.pathname || '',
                cta_id: String(cta).slice(0, 64),
                utm_source: clip(q.get('utm_source')),
                utm_medium: clip(q.get('utm_medium')),
                utm_campaign: clip(q.get('utm_campaign')),
                $lib: 'rum-inline',
                $lib_version: '1.2.0'
              }
            });
            var ctaUrl = 'https://eu.i.posthog.com/capture/';
            if (navigator.sendBeacon) {
              navigator.sendBeacon(ctaUrl, new Blob([ctaBody], { type: 'application/json' }));
            } else if (typeof fetch !== 'undefined') {
              fetch(ctaUrl, { method: 'POST', body: ctaBody, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(function() {});
            }
          } catch (e) {}
        }, true);
      }
    } catch (e) {}

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
