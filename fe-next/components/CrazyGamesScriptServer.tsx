/**
 * CrazyGames SDK Script — Server Component
 *
 * This MUST be a Server Component (no 'use client') so the <script> tags
 * appear in the initial server-rendered HTML. CrazyGames QA tool scans
 * the raw HTML source for the SDK script — if it only loads after hydration
 * (as happens with client components), the QA tool won't detect it.
 *
 * The bootstrap script is iframe-gated: it only initializes the SDK when
 * the page is running inside an iframe (CrazyGames embed). On the regular
 * website, it sets environment to 'disabled' immediately and skips init.
 */

// Force-disable via env var; otherwise always render
const CRAZYGAMES_FORCE_DISABLED = process.env.NEXT_PUBLIC_CRAZYGAMES_ENABLED === 'false';

// Bootstrap: SDK script is always in HTML (CrazyGames QA requires it in source),
// but init only runs when inside an iframe. Regular site visitors pay the script
// download cost but skip all SDK initialization.
// Static string literal — no user input involved.
const bootstrapScript = `
(function() {
  var inIframe = false;
  try { inIframe = window.self !== window.top; } catch(e) { inIframe = true; }
  if (!inIframe) {
    window.__crazyGamesEnvironment = 'disabled';
    window.__crazyGamesReady = true;
    return;
  }
  var attempts = 0;
  function tryInit() {
    if (window.CrazyGames && window.CrazyGames.SDK) {
      window.CrazyGames.SDK.init().then(function() {
        return window.CrazyGames.SDK.getEnvironment();
      }).then(function(env) {
        window.__crazyGamesEnvironment = env;
        window.__crazyGamesReady = true;
        if (env === 'crazygames') {
          document.body && document.body.classList.add('crazygames-embed');
          window.CrazyGames.SDK.game.sdkGameLoadingStart();
          var signalReady = function() { window.CrazyGames.SDK.game.sdkGameLoadingStop(); };
          if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(signalReady, { timeout: 3000 });
          } else {
            setTimeout(signalReady, 1000);
          }
        }
      }).catch(function() {
        window.__crazyGamesEnvironment = 'disabled';
        window.__crazyGamesReady = true;
      });
    } else if (attempts < 100) {
      attempts++;
      setTimeout(tryInit, 50);
    } else {
      window.__crazyGamesEnvironment = 'disabled';
      window.__crazyGamesReady = true;
    }
  }
  tryInit();
})();`;

export default function CrazyGamesScriptServer() {
  if (CRAZYGAMES_FORCE_DISABLED) {
    return null;
  }

  return (
    <>
      {/* Synchronous SDK load — CrazyGames QA tool requires this in the HTML source */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts -- Must load synchronously for CrazyGames QA detection */}
      <script src="https://sdk.crazygames.com/crazygames-sdk-v3.js" />
      {/* Bootstrap: init SDK only when in iframe, skip entirely on regular site */}
      <script dangerouslySetInnerHTML={{ __html: bootstrapScript }} />
    </>
  );
}
