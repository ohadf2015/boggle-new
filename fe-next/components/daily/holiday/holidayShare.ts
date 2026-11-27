import { trackShareCompleted } from '@/utils/share';
import { stripEmoji } from '@/lib/share/stripEmoji';
import type { HolidayKey } from '@/lib/holidays/calendar';

const INVITE_KEY = 'lx_holiday_invite';

export function shareOnWhatsApp(text: string, url: string): void {
  window.open(`https://wa.me/?text=${encodeURIComponent(`${stripEmoji(text)}\n${url}`)}`, '_blank', 'noopener');
  trackShareCompleted('whatsapp', { surface: 'holiday' });
}

export async function shareNative(rawText: string, url: string): Promise<boolean> {
  const text = stripEmoji(rawText);
  try {
    if (navigator.share) {
      await navigator.share({ text, url });
      trackShareCompleted('web_share_api', { surface: 'holiday' });
      return true;
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    trackShareCompleted('clipboard', { surface: 'holiday' });
    return true;
  } catch {
    return false;
  }
}

export function tableUrl(origin: string, locale: string, code: string): string {
  return `${origin}/${locale}/daily?table=${code}`;
}

export interface PendingInvite {
  ref: string;
  holiday: HolidayKey;
}

export function captureHolidayInvite(search: string): void {
  const q = new URLSearchParams(search);
  const ref = q.get('ref');
  const holiday = q.get('holiday');
  if (q.get('hinvite') !== '1' || !ref || (holiday !== 'hanukkah' && holiday !== 'christmas')) return;
  try {
    sessionStorage.setItem(INVITE_KEY, JSON.stringify({ ref, holiday }));
  } catch {}
}

export function takeHolidayInvite(): PendingInvite | null {
  try {
    const raw = sessionStorage.getItem(INVITE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(INVITE_KEY);
    const v = JSON.parse(raw) as PendingInvite;
    return v && typeof v.ref === 'string' && (v.holiday === 'hanukkah' || v.holiday === 'christmas') ? v : null;
  } catch {
    return null;
  }
}

export function tableCodeFrom(search: string): string | null {
  const code = new URLSearchParams(search).get('table');
  return code && /^[A-HJ-NP-Z2-9]{8}$/.test(code) ? code : null;
}
