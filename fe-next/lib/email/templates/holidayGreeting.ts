import { EMAIL_SITE, renderNeoEmail } from '@/lib/email/kit/neoEmail';
import type { HolidayKey } from '@/lib/holidays/calendar';
import { withPrivacyLink } from './playerModes';
import { asHolidayEmailLanguage, getHolidayCopy } from './holidayGreeting.copy';

export interface HolidayGreetingArgs {
  holiday: HolidayKey;
  language: string;
  recipientName: string;
  unsubscribeUrl: string;
  assetBase?: string;
}

export function holidayCtaUrl(language: string, holiday: HolidayKey): string {
  return `${EMAIL_SITE}/${asHolidayEmailLanguage(language)}?utm_source=email&utm_campaign=holiday-${holiday}-2026`;
}

export function getHolidayGreetingSubject(language: string, holiday: HolidayKey, name: string): string {
  return getHolidayCopy(language, holiday).subject(name);
}

export function holidayGreeting(args: HolidayGreetingArgs): { subject: string; html: string } {
  const lang = asHolidayEmailLanguage(args.language);
  const c = getHolidayCopy(lang, args.holiday);
  const name = c.dir === 'rtl' ? `⁨${args.recipientName}⁩` : args.recipientName;
  const neo = renderNeoEmail({
    lang,
    dir: c.dir,
    preheader: c.preview,
    accent: args.holiday === 'hanukkah' ? 'cyan' : 'pink',
    artPath: `/holidays/email-${args.holiday}.png`,
    kicker: c.badge,
    headline: c.headline,
    greeting: c.greeting(name),
    blocks: [
      { type: 'p', text: c.wish },
      { type: 'callout', text: c.event },
    ],
    cta: { label: c.cta, href: holidayCtaUrl(lang, args.holiday) },
    signoff: c.signoff,
    unsubscribe: { label: c.unsubscribe, href: args.unsubscribeUrl },
    footnote: c.footer,
    assetBase: args.assetBase,
  });
  return {
    subject: c.subject(args.recipientName),
    html: withPrivacyLink(neo, args.unsubscribeUrl, c.privacy, `${EMAIL_SITE}/${lang}/privacy`),
  };
}
