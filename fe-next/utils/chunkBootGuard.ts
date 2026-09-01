/**
 * Pre-hydration stale-chunk guard.
 *
 * ChunkErrorRecovery (components/ChunkErrorRecovery.tsx) catches chunk load
 * failures only AFTER React hydrates — it registers its listeners in a
 * useEffect. If the failure happens at boot (the page's own app chunk 404s
 * because the HTML came from a stale cached document or a mixed rolling
 * deploy), React never mounts, no listener ever exists, and the visitor is
 * left on a blank page with a bare "Loading chunk N failed" in the console
 * (growth-radar #2700/#1870: "Loading chunk 14850 failed" on /es and
 * /en/multiplayer).
 *
 * This script runs synchronously in <head>, before any app chunk loads. It
 * watches (capture phase — resource error events do not bubble) for failed
 * <script>/<link> loads under /_next/static/ and for "Loading chunk" errors,
 * and hard-reloads ONCE per page load to pull the fresh build. The guard flag
 * lives in sessionStorage so a genuinely offline client cannot reload-loop:
 * the second failed load sees the flag and stops. The flag is cleared on
 * every `load` event — resource errors always fire BEFORE `load`, so a clean
 * boot clears it for the next navigation, and since error events never
 * self-generate, an offline client still can't loop (each reload needs a
 * fresh error, and the flag blocks exactly one).
 *
 * Static literal, inlined into a <script> tag in the locale layout — no user
 * input, must stay dependency-free (runs before the app bundle loads). Placed
 * AFTER the storage shim so sessionStorage is always safe to touch.
 */
export const CHUNK_BOOT_GUARD_SCRIPT = `(function(){var KEY='lc_chunk_boot_reload';function has(){try{return sessionStorage.getItem(KEY)==='1'}catch(e){return false}}function mark(){try{sessionStorage.setItem(KEY,'1')}catch(e){}}function clear(){try{sessionStorage.removeItem(KEY)}catch(e){}}function reloadOnce(){if(has())return;mark();window.location.reload()}window.addEventListener('error',function(e){var t=e&&e.target;if(t&&(t.tagName==='SCRIPT'||t.tagName==='LINK')){var src=t.src||t.href||'';if(src.indexOf('/_next/static/')!==-1)reloadOnce();return}var m=(e&&e.message)||'';if(/loading (css )?chunk|dynamically imported module/i.test(m))reloadOnce()},true);window.addEventListener('load',function(){clear()})})();`;
