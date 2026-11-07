/**
 * Teacher practice run: the teacher opens the student page beside their own
 * board (same-origin iframe, or another tab or phone via ?practiceSeat=1).
 * That page runs with the teacher's account, like a second tab, but it must
 * never disturb the host page next to it:
 *
 * - App data (game session, username, rejoin tokens, prefs) lives in memory,
 *   so the student page can't overwrite the host's saved room or name.
 * - Supabase auth cookies (`sb-*`) are shared, so the student page stays
 *   signed in as the teacher, but it can never delete them, so nothing it does
 *   signs the teacher out.
 * - Cross-tab messages are muted, so its SIGNED_OUT or session broadcasts never
 *   reach the host tab.
 * - Framed beside the board, it starts with music and sound effects off, so the
 *   room hears the board's sound once.
 *
 * The server gives this page its own practice seat (never the host seat, never
 * counted as a student); see backend/handlers/practiceSeat.ts.
 *
 * Static literal inlined right after STORAGE_SHIM_SCRIPT in the root layout:
 * no user input, dependency-free, a no-op unless the URL has practiceSeat=1.
 */
export const PRACTICE_SEAT_PARAM = 'practiceSeat';

export const PRACTICE_SEAT_SCRIPT = `(function(){try{
var q=String((window.location&&window.location.search)||'');
if(!/[?&]practiceSeat=1(&|$)/.test(q))return;
window.__LC_PRACTICE_SEAT__=true;
function isAuth(k){return String(k).indexOf('sb-')===0}
function overlay(real){var m={};function keys(){var out=[];try{for(var i=0;i<real.length;i++){var k=real.key(i);if(k!==null&&isAuth(k))out.push(k)}}catch(e){}for(var x in m)if(Object.prototype.hasOwnProperty.call(m,x))out.push(x);return out}
return{getItem:function(k){if(isAuth(k)){try{return real.getItem(k)}catch(e){return null}}return Object.prototype.hasOwnProperty.call(m,k)?m[k]:null},
setItem:function(k,v){if(isAuth(k)){try{real.setItem(k,String(v))}catch(e){}return}m[k]=String(v)},
removeItem:function(k){if(isAuth(k))return;delete m[k]},
clear:function(){m={}},
key:function(i){return keys()[i]||null},
get length(){return keys().length}}}
var framed=false;try{framed=window.self!==window.top}catch(e){framed=true}
window.__LC_PRACTICE_FRAMED__=framed;
['localStorage','sessionStorage'].forEach(function(n){try{var real=window[n];var o=overlay(real);
if(framed&&n==='localStorage'){o.setItem('boggle_music_settings','{"volume":0.5,"isMuted":true}');o.setItem('boggle_sfx_settings','{"volume":0.7,"muted":true}')}
Object.defineProperty(window,n,{value:o,configurable:true})}catch(e){}});
try{var d=window.document;var proto=Object.getPrototypeOf(d);var desc=null;while(proto&&!desc){desc=Object.getOwnPropertyDescriptor(proto,'cookie');proto=Object.getPrototypeOf(proto)}
if(desc&&desc.get&&desc.set){var jar={};
Object.defineProperty(d,'cookie',{configurable:true,
get:function(){var real=String(desc.get.call(d)||'');var parts=real?real.split(/;\\s*/).filter(function(p){return isAuth(p)}):[];for(var c in jar)if(Object.prototype.hasOwnProperty.call(jar,c))parts.push(c+'='+jar[c]);return parts.join('; ')},
set:function(v){var s=String(v);var first=s.split(';')[0];var eq=first.indexOf('=');var name=(eq<0?first:first.slice(0,eq)).trim();var val=eq<0?'':first.slice(eq+1);
var ex=s.match(/;\\s*expires=([^;]+)/i);var gone=/;\\s*max-age=\\s*(0|-)/i.test(s)||!!(ex&&Date.parse(ex[1])<=Date.now());
if(isAuth(name)){if(gone||val==='')return;desc.set.call(d,s);return}
if(gone)delete jar[name];else jar[name]=val}})}}catch(e){}
try{if(window.BroadcastChannel&&window.BroadcastChannel.prototype){window.BroadcastChannel.prototype.postMessage=function(){}}}catch(e){}
}catch(e){}})();`;

/** True when this page is a teacher's practice seat (set by PRACTICE_SEAT_SCRIPT). */
export function isPracticeSeatPage(): boolean {
  if (typeof window === 'undefined') return false;
  return (window as unknown as { __LC_PRACTICE_SEAT__?: boolean }).__LC_PRACTICE_SEAT__ === true;
}

/** The practice page is framed beside the teacher's board: no sound, no history tricks. */
export function isFramedPracticeSeat(): boolean {
  if (!isPracticeSeatPage()) return false;
  return (window as unknown as { __LC_PRACTICE_FRAMED__?: boolean }).__LC_PRACTICE_FRAMED__ === true;
}

/**
 * Spread into every client `join` payload (first join, reconnect, reload,
 * not-seated re-seat). Without it a same-account reconnect from the practice
 * page would take the server's signed-in host path.
 */
export function practiceSeatJoinFlag(): { practiceSeat?: true } {
  return isPracticeSeatPage() ? { practiceSeat: true } : {};
}

const SEAT_NAME_KEY = 'eduLiveRoom.practice.seatName';

/** The practice seat's name, or null while the catalogue still returns the raw key (joining then would name the seat after the key). */
export function resolvePracticeSeatName(t: (key: string) => string): string | null {
  const name = t(SEAT_NAME_KEY);
  return name && name !== SEAT_NAME_KEY ? name : null;
}
