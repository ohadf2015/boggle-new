import type { ArcadeGameId } from './arcade/games';
import type { HolidayKey } from './calendar';
import type { LandingFaq, LandingLocale } from './landing';
import { HANUKKAH_COPY } from './landingCopyHanukkah';
import { CHRISTMAS_COPY } from './landingCopyChristmas';
import { CHRISTMAS_COPY_JA_RU } from './landingCopyChristmasJaRu';

export interface LandingFeature {
  art: string;
  title: string;
  body: string;
}

export interface LandingCopy {
  dateLocale: string;
  mascot: string;
  mascotLabel: string;
  intro: string;
  liveBadge: string;
  offBanner: string;
  offUnknown: string;
  ctaLive: string;
  ctaOff: string;
  ctaDaily: string;
  insideTitle: string;
  features: LandingFeature[];
  arcadeTitle: string;
  arcadeBody: string;
  arcadeOff: string;
  arcade: Partial<Record<ArcadeGameId, { name: string; blurb: string }>>;
  eggTitle: string;
  eggBody: string;
  faqTitle: string;
  faqs: LandingFaq[];
  whenQ: string;
  whenA: string;
  whenUnknown: string;
  closingTitle: string;
  closingBody: string;
}

export type LandingCopyTable = Partial<Record<LandingLocale, LandingCopy>>;

const TABLE: Record<HolidayKey, LandingCopyTable> = {
  hanukkah: HANUKKAH_COPY,
  christmas: { ...CHRISTMAS_COPY, ...CHRISTMAS_COPY_JA_RU },
};

export function landingCopy(holiday: HolidayKey, locale: LandingLocale): LandingCopy {
  const copy = TABLE[holiday][locale];
  if (!copy) throw new Error(`No ${holiday} landing copy for ${locale}`);
  return copy;
}

export function formatLandingDate(date: string, dateLocale: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat(dateLocale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');
}
