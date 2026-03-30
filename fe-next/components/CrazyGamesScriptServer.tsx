/**
 * CrazyGames SDK Script Loader
 *
 * Uses next/script with beforeInteractive strategy to ensure the SDK
 * script tags appear in the initial server-rendered HTML <head>.
 *
 * IMPORTANT: Raw <script> tags in Server Components are stripped by
 * Next.js App Router — they render in the RSC payload but never make
 * it into the actual HTML document. next/script beforeInteractive is
 * the only way to guarantee scripts appear in the initial HTML.
 *
 * The bootstrap script is iframe-gated: it only initializes the SDK when
 * the page is running inside an iframe (CrazyGames embed). On the regular
 * website, it sets environment to 'disabled' immediately and skips init.
 */
import Script from 'next/script';

// Force-disable via env var; otherwise always render
const CRAZYGAMES_FORCE_DISABLED = process.env.NEXT_PUBLIC_CRAZYGAMES_ENABLED === 'false';

// Bootstrap: SDK script is always in HTML (CrazyGames QA requires it in source),
// but init only runs when inside an iframe. Regular site visitors pay the script
// download cost but skip all SDK initialization.
// SECURITY: Static string literal — no user input involved, safe for inline script.
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
      {/* SDK load — CrazyGames QA tool requires this in the HTML source.
          beforeInteractive ensures it appears in the initial <head> HTML. */}
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
      <Script
        src="https://sdk.crazygames.com/crazygames-sdk-v3.js"
        strategy="beforeInteractive"
      />
      {/* Bootstrap: init SDK only when in iframe, skip entirely on regular site.
          Content is a static string literal — no user input, no XSS risk. */}
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
      <Script
        id="crazygames-bootstrap"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: bootstrapScript }}
      />
    </>
  );
}
