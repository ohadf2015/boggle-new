/**
 * CrazyGames SDK Script — Server Component
 *
 * Renders the CrazyGames SDK <script> tags using next/script with lazyOnload
 * strategy so they do not block initial page rendering. The bootstrap code
 * polls for the SDK with retries, so load ordering is independently handled.
 *
 * This component was previously injected via Express middleware
 * (crazyGamesInjector.ts), which caused hydration mismatches because React
 * didn't know about the extra DOM nodes. Moved into the React tree.
 *
 * SECURITY: All content is static string literals — no user input.
 */

import Script from 'next/script';

// Opt-in load. The CrazyGames SDK only does anything inside a crazygames.com
// iframe; on our own domains (lexiclash.live) it self-disables yet still costs a
// third-party <script> on every page. PostHog (90d) showed the web/CrazyGames
// rewarded path delivered 0 watches ever — all 27 successful rewarded watches
// were native AdMob. So load the SDK ONLY when explicitly enabled for a
// CrazyGames-distributed build (NEXT_PUBLIC_CRAZYGAMES_ENABLED=true).
const CRAZYGAMES_ENABLED = process.env.NEXT_PUBLIC_CRAZYGAMES_ENABLED === 'true';

// Bootstrap calls sdkGameLoadingStart() immediately but does NOT call sdkGameLoadingStop().
// The React CrazyGamesProvider calls loadingStop() once the app is interactive,
// giving CrazyGames an accurate "time to interactive" measurement.
// Fallback: if SDK fails to load but we're clearly in a CrazyGames iframe (referrer/ancestorOrigins),
// set environment to 'crazygames' so external auth stays hidden.
const BOOTSTRAP_CODE = `(function(){function isCgHost(){try{var h=window.location&&window.location.hostname;if(h==='icecream.me'||(h&&h.indexOf('.icecream.me',h.length-'.icecream.me'.length)!==-1))return true}catch(e){}return false}var inIframe=false;try{inIframe=window.self!==window.top}catch(e){inIframe=true}if(!inIframe&&!isCgHost()){window.__crazyGamesEnvironment='disabled';window.__crazyGamesReady=true;return}function isCrossOriginIframe(){if(!inIframe)return false;try{void window.parent.location.href;return false}catch(e){return true}}function isCgIframe(){try{if(window.location.ancestorOrigins&&window.location.ancestorOrigins.length){for(var i=0;i<window.location.ancestorOrigins.length;i++){if(window.location.ancestorOrigins[i].indexOf('crazygames.com')!==-1)return true}}}catch(e){}try{if(document.referrer&&document.referrer.indexOf('crazygames.com')!==-1)return true}catch(e){}if(isCgHost())return true;if(isCrossOriginIframe())return true;return false}if(isCgIframe())document.body&&document.body.classList.add('crazygames-embed');var attempts=0;function tryInit(){if(window.CrazyGames&&window.CrazyGames.SDK){window.CrazyGames.SDK.init().then(function(){return window.CrazyGames.SDK.getEnvironment()}).then(function(env){window.__crazyGamesEnvironment=env;window.__crazyGamesReady=true;if(env==='crazygames'){document.body&&document.body.classList.add('crazygames-embed');window.CrazyGames.SDK.game.sdkGameLoadingStart()}}).catch(function(){window.__crazyGamesEnvironment=isCgIframe()?'crazygames':'disabled';window.__crazyGamesReady=true;if(isCgIframe())document.body&&document.body.classList.add('crazygames-embed')})}else if(attempts<100){attempts++;setTimeout(tryInit,50)}else{window.__crazyGamesEnvironment=isCgIframe()?'crazygames':'disabled';window.__crazyGamesReady=true;if(isCgIframe())document.body&&document.body.classList.add('crazygames-embed')}}tryInit()})()`;

export default function CrazyGamesScriptServer() {
  if (!CRAZYGAMES_ENABLED) {
    return null;
  }

  return (
    <>
      <Script
        src="https://sdk.crazygames.com/crazygames-sdk-v3.js"
        strategy="lazyOnload"
      />
      <Script
        id="crazygames-bootstrap"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{ __html: BOOTSTRAP_CODE }}
      />
    </>
  );
}