import { CHRISTMAS_LOCALES, holidayWindows } from './calendar';
import { HOLIDAY_COOKIE, HOLIDAY_COOKIE_MAX_AGE } from './override';

const FIRST_YEAR = 2026;
const LAST_YEAR = 2028;

const YEARS = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);

export const HOLIDAY_WINDOW_TABLE: [string, string, string, string][] = YEARS.flatMap((y) => [
  ...holidayWindows(y).map((w): [string, string, string, string] => [w.key, w.start, w.end, '']),
  ...CHRISTMAS_LOCALES.map((l): [string, string, string, string] => {
    const w = holidayWindows(y, l).find((x) => x.key === 'christmas')!;
    return [w.key, w.start, w.end, l];
  }),
]);

// Mirrors resolveRegion + activeHoliday in plain ES5 so the class lands before first paint; a locale row extends its default row.
export function buildPrepaintScript(dev: boolean): string {
  return (
    `(function(){try{var W=${JSON.stringify(HOLIDAY_WINDOW_TABLE)};` +
    `var d=document.documentElement,n=new Date(),p=function(x){return(x<10?'0':'')+x};` +
    `var t=n.getFullYear()+'-'+p(n.getMonth()+1)+'-'+p(n.getDate());` +
    `var K=['hanukkah','christmas','off'],s=location.search||'';` +
    `var g=function(k){var m=s.match(new RegExp('[?&]'+k+'=([^&]*)'));return m?m[1]:null};` +
    `var v=g('holiday');` +
    `if(K.indexOf(v)>=0){document.cookie='${HOLIDAY_COOKIE}='+v+'; path=/; max-age=${HOLIDAY_COOKIE_MAX_AGE}; samesite=lax'}` +
    `else{var c=(document.cookie||'').match(/(?:^|; )${HOLIDAY_COOKIE}=([^;]+)/);v=c&&K.indexOf(c[1])>=0?c[1]:null}` +
    `var f=${dev ? 'true' : 'false'}||g('holidayPreview')==='1';` +
    `var z='';try{z=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}` +
    `var il=z==='Asia/Jerusalem'||z==='Asia/Tel_Aviv'||/^he\\b/i.test(d.lang||'');` +
    `var L=(d.lang||'').slice(0,2).toLowerCase();` +
    `var o=function(k){for(var i=0;i<W.length;i++)if(W[i][0]===k&&(!W[i][3]||W[i][3]===L)&&t>=W[i][1]&&t<=W[i][2])return true;return false};` +
    `var h=null,k=il?'hanukkah':'christmas';` +
    `if(v==='off')h=null;else if(v&&(f||o(v))){h=v;if(!o(v))d.setAttribute('data-holiday-preview','1')}else if(o(k))h=k;` +
    `d.setAttribute('data-holiday-region',il?'IL':'world');` +
    `if(h)d.classList.add('holiday-'+h)}catch(e){}})();`
  );
}

export const HOLIDAY_PREPAINT_SCRIPT = buildPrepaintScript(process.env.NODE_ENV !== 'production');
