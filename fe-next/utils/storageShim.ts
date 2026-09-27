/**
 * Runs before any other script. In blocked-storage contexts (Safari private
 * mode, sandboxed in-app/social webviews) every raw localStorage/sessionStorage
 * call throws — and 150+ call sites across the app assume it never does,
 * crashing straight to the global error boundary with no recovery (Try Again
 * re-throws). Swap in an in-memory stand-in the instant a real write fails, so
 * every existing call site becomes safe without touching any of them.
 *
 * Static literal, inlined into a <script> tag in the root layout — no user
 * input, must stay dependency-free (runs before the app bundle loads).
 *
 * Deliberate tradeoff: if reads work but writes throw (some Safari-private-mode
 * variants), this still swaps in an empty in-memory store, discarding whatever
 * was previously persisted for the session. Losing stale prefs beats crashing.
 */
export const STORAGE_SHIM_SCRIPT = `(function(){function ok(n){try{var s=window[n];var k='__lc_shim__';s.setItem(k,'1');s.removeItem(k);return true}catch(e){return false}}function mem(){var m={};return{getItem:function(k){return Object.prototype.hasOwnProperty.call(m,k)?m[k]:null},setItem:function(k,v){m[k]=String(v)},removeItem:function(k){delete m[k]},clear:function(){m={}},key:function(i){return Object.keys(m)[i]||null},get length(){return Object.keys(m).length}}}try{if(!ok('localStorage'))Object.defineProperty(window,'localStorage',{value:mem(),configurable:true})}catch(e){}try{if(!ok('sessionStorage'))Object.defineProperty(window,'sessionStorage',{value:mem(),configurable:true})}catch(e){}})();`;
