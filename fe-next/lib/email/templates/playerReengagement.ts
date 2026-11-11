import { EMAIL_SITE, renderNeoEmail, type NeoBlock } from '@/lib/email/kit/neoEmail';
import type { WelcomeEmailMode } from '@/lib/email/welcomeModes';
import { modeChipsHtml, withPrivacyLink } from './playerModes';
import type { PlayerLocale } from './playerWelcome.copy';
import { REENGAGEMENT_COPY, SUBJECT_LINES, type ReengagementCopy } from './playerReengagement.copy';

export { SUBJECT_LINES };

export interface PlayerReengagementArgs {
  recipientName: string;
  firstLetter: string;
  language: string;
  unsubscribeUrl: string;
  playUrl: string;
  wordLength?: number;
  daysSinceLastPlay?: number;
  playersToday?: number;
  hoursUntilReset?: number;
  modes?: WelcomeEmailMode[];
}

// Below these the line reads oddly ("1 days away", "12 players"); above 12h the countdown stops pulling.
const MISSED_DAYS_FLOOR = 7;
const SOLVED_TODAY_FLOOR = 50;
const HOURS_LEFT_CEILING = 12;
const MIN_TILES = 2;
const MAX_TILES = 8;
const DEFAULT_TILES = 4;

function resolve(language: string): { locale: PlayerLocale; c: ReengagementCopy } {
  const locale = (language in REENGAGEMENT_COPY ? language : 'en') as PlayerLocale;
  return { locale, c: REENGAGEMENT_COPY[locale] };
}

export function getReengagementSubject(language: string, firstLetter: string, recipientName: string): string {
  const lines = SUBJECT_LINES[language] || SUBJECT_LINES.en;
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return lines[dayOfYear % lines.length](firstLetter, recipientName);
}

function fmt(n: number, tag: string): string {
  try {
    return new Intl.NumberFormat(tag).format(n);
  } catch {
    return String(n);
  }
}

export function playerReengagement(args: PlayerReengagementArgs): { subject: string; html: string } {
  const { locale, c } = resolve(args.language);
  const name = c.dir === 'rtl' ? `\u2068${args.recipientName}\u2069` : args.recipientName;
  const total = Math.max(
    MIN_TILES,
    Math.min(MAX_TILES, Number.isFinite(args.wordLength) ? (args.wordLength as number) : DEFAULT_TILES),
  );

  const stats: { value: string; label: string }[] = [];
  if (typeof args.playersToday === 'number' && args.playersToday >= SOLVED_TODAY_FLOOR) {
    stats.push({ value: fmt(args.playersToday, c.numberLocale), label: c.solvedLabel });
  }
  const h = args.hoursUntilReset;
  if (typeof h === 'number' && h > 0 && h < HOURS_LEFT_CEILING) {
    stats.push({ value: c.hours(h), label: c.hoursLabel });
  }

  const blocks: NeoBlock[] = [
    { type: 'p', text: c.hint, strong: true },
    { type: 'tiles', word: args.firstLetter + '\u00a0'.repeat(total - 1) },
  ];
  const d = args.daysSinceLastPlay;
  if (typeof d === 'number' && d >= MISSED_DAYS_FLOOR) blocks.push({ type: 'callout', text: c.missedDays(d) });
  blocks.push({ type: 'p', text: c.pitch });
  if (stats.length) blocks.push({ type: 'stats', items: stats });
  if (args.modes?.length) blocks.push({ type: 'html', html: modeChipsHtml(args.modes, c.modesTitle, c.dir) });

  const neo = renderNeoEmail({
    lang: locale,
    dir: c.dir,
    preheader: c.preheader(args.firstLetter),
    accent: 'cyan',
    art: 'miss-you',
    kicker: c.kicker,
    headline: c.headline,
    greeting: c.greeting(name),
    blocks,
    cta: { label: c.cta, href: args.playUrl },
    signoff: c.signoff,
    unsubscribe: { label: c.unsubscribe, href: args.unsubscribeUrl },
    footnote: c.footnote,
  });
  const html = withPrivacyLink(neo, args.unsubscribeUrl, c.privacy, `${EMAIL_SITE}/${locale}/privacy`);

  return { subject: getReengagementSubject(args.language, args.firstLetter, args.recipientName), html };
}
