import { EMAIL_SITE, NEO_COLORS, escapeHtml, renderNeoEmail } from '@/lib/email/kit/neoEmail';
import type { WelcomeEmailMode } from '@/lib/email/welcomeModes';
import { playStoreUrlWithReferrer } from '@/utils/androidApp';
import { modeCardsHtml, modesText, withPrivacyLink } from './playerModes';
import { WELCOME_COPY, type PlayerLocale, type WelcomeCopy } from './playerWelcome.copy';

export interface PlayerWelcomeArgs {
  recipientName: string;
  language: string;
  unsubscribeUrl: string;
  playUrl: string;
  videoUrl: string;
  baseUrl?: string;
  androidUrl?: string;
  modes: WelcomeEmailMode[];
}

function resolve(language: string): { locale: PlayerLocale; c: WelcomeCopy } {
  const locale = (language in WELCOME_COPY ? language : 'en') as PlayerLocale;
  return { locale, c: WELCOME_COPY[locale] };
}

export function getWelcomeSubject(language: string, recipientName: string): string {
  return resolve(language).c.subject(recipientName);
}

function tourHtml(videoUrl: string, label: string): string {
  return `<a href="${videoUrl}" style="display:block;margin:2px 0 22px 0;text-decoration:none;border:3px solid ${NEO_COLORS.black};border-bottom-width:6px;border-radius:8px;overflow:hidden;"><img src="${EMAIL_SITE}/email/welcome-video.gif" width="534" alt="${escapeHtml(label)}" style="display:block;width:100%;height:auto;border:0;"></a>`;
}

export function playerWelcome(args: PlayerWelcomeArgs): { subject: string; html: string; text: string } {
  const { locale, c } = resolve(args.language);
  const androidUrl = args.androidUrl || playStoreUrlWithReferrer('welcome_email', locale);
  const subject = c.subject(args.recipientName);

  const privacyUrl = `${args.baseUrl || EMAIL_SITE}/${locale}/privacy`;
  const neo = renderNeoEmail({
    lang: locale,
    dir: c.dir,
    preheader: c.preheader,
    accent: 'pink',
    art: 'welcome',
    kicker: c.kicker,
    headline: c.headline,
    greeting: c.greeting(args.recipientName),
    blocks: [
      { type: 'p', text: c.intro },
      { type: 'html', html: tourHtml(args.videoUrl, c.tour) },
      { type: 'html', html: modeCardsHtml(args.modes, c.modesTitle, c.dir) },
    ],
    cta: { label: c.cta, href: args.playUrl },
    secondary: { label: c.android, href: androidUrl },
    signoff: c.signoff,
    unsubscribe: { label: c.unsubscribe, href: args.unsubscribeUrl },
    footnote: c.footnote,
  });
  const html = withPrivacyLink(neo, args.unsubscribeUrl, c.privacy, privacyUrl);

  const text = [
    c.greeting(args.recipientName),
    c.intro,
    `${c.tour}: ${args.videoUrl}`,
    `${c.modesTitle}:\n${modesText(args.modes)}`,
    `${c.cta}: ${args.playUrl}`,
    `${c.android}: ${androidUrl}`,
    c.signoff,
    `${c.footnote}\n${c.unsubscribe}: ${args.unsubscribeUrl}\n${c.privacy}: ${privacyUrl}`,
  ].join('\n\n');

  return { subject, html, text };
}
