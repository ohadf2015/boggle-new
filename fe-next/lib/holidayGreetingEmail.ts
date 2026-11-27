import { Resend } from 'resend';
import { getHolidayGreetingSubject, holidayCtaUrl, holidayGreeting } from '@/lib/email/templates/holidayGreeting';
import { asHolidayEmailLanguage, type HolidayEmailLanguage } from '@/lib/email/templates/holidayGreeting.copy';
import type { HolidayKey } from '@/lib/holidays/calendar';
import { defaultHoliday, resolveRegion } from '@/lib/holidays/region';
import { COUNTRY_TO_LANGUAGE } from '@/lib/reengagementEmail';
import { withTimeout, isEmailServiceConfigured } from '@/lib/email';

export { holidayCtaUrl, getHolidayGreetingSubject };

export const HOLIDAY_KEYS_FOR_EMAIL: readonly HolidayKey[] = ['hanukkah', 'christmas'];

export async function generateHolidayGreetingHtml(params: {
  holiday: HolidayKey;
  language: string;
  recipientName: string;
  unsubscribeUrl: string;
}): Promise<{ subject: string; html: string }> {
  return holidayGreeting(params);
}

const EXTRA_COUNTRY_LANGUAGES: Record<string, HolidayEmailLanguage> = { RU: 'ru', BY: 'ru', KZ: 'ru' };

export interface HolidayAudienceProfile {
  country_code?: string | null;
  timezone?: string | null;
  language?: string | null;
}

export function holidayEmailLanguage(p: HolidayAudienceProfile): HolidayEmailLanguage {
  if (p.language) return asHolidayEmailLanguage(p.language);
  const cc = p.country_code?.toUpperCase() ?? '';
  return asHolidayEmailLanguage(EXTRA_COUNTRY_LANGUAGES[cc] ?? COUNTRY_TO_LANGUAGE[cc] ?? 'en');
}

export function holidayForProfile(p: HolidayAudienceProfile): HolidayKey {
  return defaultHoliday(
    resolveRegion({ countryCode: p.country_code, timeZone: p.timezone, locale: holidayEmailLanguage(p) })
  );
}

export async function sendHolidayGreetingToRecipient(params: {
  email: string;
  recipientName: string;
  language: string;
  holiday: HolidayKey;
  unsubscribeUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!isEmailServiceConfigured()) return { success: false, error: 'Email service not configured' };
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { subject, html } = await withTimeout(
      generateHolidayGreetingHtml(params),
      8000,
      'Email render timed out after 8 seconds'
    );
    const result = await withTimeout(
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: params.email,
        subject,
        html,
        headers: {
          'List-Unsubscribe': `<${params.unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
      15000,
      'Resend API timed out after 15 seconds'
    );
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export type HolidayLanguageCounts = Record<HolidayKey, Partial<Record<HolidayEmailLanguage, number>>>;

export function planHolidayGreeting<T extends HolidayAudienceProfile>(recipients: T[], only?: HolidayKey) {
  const counts: HolidayLanguageCounts = { hanukkah: {}, christmas: {} };
  const plan: Array<{ recipient: T; holiday: HolidayKey; language: HolidayEmailLanguage }> = [];
  for (const recipient of recipients) {
    const holiday = holidayForProfile(recipient);
    if (only && holiday !== only) continue;
    const language = holidayEmailLanguage(recipient);
    counts[holiday][language] = (counts[holiday][language] ?? 0) + 1;
    plan.push({ recipient, holiday, language });
  }
  return { plan, counts };
}
