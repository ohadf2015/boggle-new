import type { Metadata } from 'next';
import { holidayWindows, localDateIn, windowFor, type HolidayKey, type HolidayWindow } from './calendar';

export type LandingLocale = 'en' | 'he' | 'es' | 'sv' | 'ja' | 'ru';

export interface HolidayLanding {
  holiday: HolidayKey;
  locale: LandingLocale;
  slug: string;
  linkLabel: string;
  title: string;
  h1: string;
  description: string;
  keywords: string;
}

export interface LandingSeason {
  live: boolean;
  window: HolidayWindow | null;
}

export interface LandingFaq {
  q: string;
  a: string;
}

export const LANDING_BASE_URL = 'https://www.lexiclash.live';

export const HOLIDAY_LANDINGS: readonly HolidayLanding[] = [
  {
    holiday: 'hanukkah',
    locale: 'he',
    slug: 'mischakim-lechanuka',
    linkLabel: 'משחקים לחנוכה',
    title: 'משחקים לחנוכה: משחק מילים לכל המשפחה, בחינם',
    h1: 'משחקים לחנוכה: שמונה לילות של משחק מילים',
    description: 'משחק מילים לחנוכה שמשחקים בדפדפן: מדליקים נר בכל לילה, אוספים פרסים וחוגגים עם כל המשפחה, מהטלפון או מהטלוויזיה. בחינם ובלי להוריד כלום.',
    keywords: 'משחקים לחנוכה, משחקי חנוכה, משחק מילים לחנוכה, חידון חנוכה, משחקי מילים, משחקים לחנוכה למשפחה',
  },
  {
    holiday: 'hanukkah',
    locale: 'en',
    slug: 'hanukkah-word-game',
    linkLabel: 'Hanukkah word game',
    title: 'Hanukkah Word Game: 8 Nights of Free Online Play',
    h1: 'A Hanukkah word game for all eight nights',
    description: 'Light a candle every night you play. A free Hanukkah word game in your browser with gelt tiles, dreidel spins and prizes for the whole family.',
    keywords: 'hanukkah word game, hanukkah games online, chanukah games for families, hanukkah games free, 8 nights games',
  },
  {
    holiday: 'christmas',
    locale: 'en',
    slug: 'christmas-word-game',
    linkLabel: 'Christmas word game',
    title: 'Christmas Word Game Online: Free Multiplayer Fun',
    h1: 'A Christmas word game the whole family can play',
    description: 'Open a gift every day from Dec 14 to 25. A free online Christmas word game for family and friends, on phones, laptops and the TV. No download.',
    keywords: 'christmas word game, christmas games online, christmas word games for family, free christmas games, multiplayer christmas game',
  },
  {
    holiday: 'christmas',
    locale: 'es',
    slug: 'juegos-de-navidad',
    linkLabel: 'Juegos de Navidad',
    title: 'Juegos de Navidad online gratis: palabras en familia',
    h1: 'Juegos de Navidad para jugar en familia',
    description: 'Un juego de palabras navideño, gratis y online: abre un regalo cada día, juega con tu familia desde el móvil o la tele y llega hasta Reyes.',
    keywords: 'juegos de navidad, juego de palabras navidad, juegos navideños online gratis, juegos de navidad en familia, juegos de reyes',
  },
  {
    holiday: 'christmas',
    locale: 'sv',
    slug: 'julspel',
    linkLabel: 'Julspel',
    title: 'Julspel online gratis: ordspel för hela familjen',
    h1: 'Julspel för hela familjen, direkt i webbläsaren',
    description: 'Ett gratis ordspel i juletid: öppna en julklapp varje dag 14–25 december och spela med familjen på mobilen eller tv:n. Inget att ladda ner.',
    keywords: 'julspel, julspel online, ordspel jul, julspel för familjen, gratis julspel, ordspel online',
  },
  {
    holiday: 'christmas',
    locale: 'ja',
    slug: 'kurisumasu-gemu',
    linkLabel: 'クリスマスゲーム',
    title: 'クリスマスゲーム無料｜家族で遊べる言葉ゲーム',
    h1: '家族で遊べるクリスマスの言葉ゲーム',
    description: 'ブラウザで遊べる無料のクリスマス言葉ゲーム。12月14日から毎日プレゼントが開き、スマホやテレビで家族や友だちと一緒に盛り上がれます。',
    keywords: 'クリスマス ゲーム 無料, クリスマスゲーム, 言葉 ゲーム, 家族 ゲーム ブラウザ, ワードゲーム',
  },
  {
    holiday: 'christmas',
    locale: 'ru',
    slug: 'novogodnie-igry',
    linkLabel: 'Новогодние игры',
    title: 'Новогодние игры онлайн: игра в слова для всей семьи',
    h1: 'Новогодние игры в слова для всей семьи',
    description: 'Бесплатная новогодняя игра в слова в браузере: каждый день новый подарок, игра с семьёй на телефоне или телевизоре, праздник до 7 января.',
    keywords: 'новогодние игры, игры на новый год, игры на новый год слова, новогодние игры онлайн, игра в слова для семьи',
  },
];

const OG_LOCALE: Record<LandingLocale, string> = {
  en: 'en_US',
  he: 'he_IL',
  es: 'es_ES',
  sv: 'sv_SE',
  ja: 'ja_JP',
  ru: 'ru_RU',
};

const LOCALE_TZ: Record<LandingLocale, string> = {
  en: 'America/New_York',
  he: 'Asia/Jerusalem',
  es: 'Europe/Madrid',
  sv: 'Europe/Stockholm',
  ja: 'Asia/Tokyo',
  ru: 'Europe/Moscow',
};

const HERO: Record<HolidayKey, { url: string; width: number; height: number }> = {
  hanukkah: { url: '/holidays/hero-hanukkah.webp', width: 804, height: 356 },
  christmas: { url: '/holidays/hero-christmas.webp', width: 1344, height: 768 },
};

export function landingFor(holiday: HolidayKey, locale: string): HolidayLanding | null {
  return HOLIDAY_LANDINGS.find((p) => p.holiday === holiday && p.locale === locale) ?? null;
}

export function landingBySlug(slug: string): HolidayLanding {
  const page = HOLIDAY_LANDINGS.find((p) => p.slug === slug);
  if (!page) throw new Error(`Unknown holiday landing ${slug}`);
  return page;
}

export function landingPath(p: HolidayLanding): string {
  return `/${p.locale}/${p.slug}`;
}

export function landingUrl(p: HolidayLanding): string {
  return `${LANDING_BASE_URL}${landingPath(p)}`;
}

export function heroArt(holiday: HolidayKey) {
  return HERO[holiday];
}

export function landingAlternates(p: HolidayLanding): Record<string, string> {
  const siblings = HOLIDAY_LANDINGS.filter((s) => s.holiday === p.holiday);
  const out: Record<string, string> = {};
  for (const s of siblings) out[s.locale] = landingUrl(s);
  out['x-default'] = out.en ?? landingUrl(p);
  return out;
}

export function landingSeason(holiday: HolidayKey, locale: LandingLocale, now: Date): LandingSeason {
  const today = localDateIn(now, LOCALE_TZ[locale]);
  const live = windowFor(holiday, today, locale);
  if (live) return { live: true, window: live };
  const year = Number(today.slice(0, 4));
  const next = [year, year + 1]
    .flatMap((y) => holidayWindows(y, locale))
    .find((w) => w.key === holiday && w.start > today);
  return { live: false, window: next ?? null };
}

export function landingMetadata(p: HolidayLanding, requestLocale: string): Metadata {
  const url = landingUrl(p);
  const hero = HERO[p.holiday];
  const image = { url: `${LANDING_BASE_URL}${hero.url}`, width: hero.width, height: hero.height, alt: p.h1 };
  return {
    title: p.title,
    description: p.description,
    keywords: p.keywords,
    openGraph: { title: p.title, description: p.description, locale: OG_LOCALE[p.locale], type: 'website', url, images: [image] },
    twitter: { card: 'summary_large_image', title: p.title, description: p.description, images: [image.url] },
    alternates: { canonical: url, languages: landingAlternates(p) },
    robots: { index: requestLocale === p.locale, follow: true },
  };
}

export function landingJsonLd(p: HolidayLanding, season: LandingSeason, faqs: readonly LandingFaq[]) {
  const url = landingUrl(p);
  const image = `${LANDING_BASE_URL}${HERO[p.holiday].url}`;
  const game = {
    '@type': 'VideoGame',
    '@id': `${url}#game`,
    name: 'LexiClash',
    url,
    image,
    inLanguage: p.locale,
    genre: ['Word game', 'Party game'],
    gamePlatform: ['Web browser', 'Android', 'iOS'],
    applicationCategory: 'GameApplication',
    playMode: ['MultiPlayer', 'SinglePlayer'],
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
  const graph: Record<string, unknown>[] = [
    { '@type': 'WebPage', '@id': `${url}#page`, url, name: p.title, description: p.description, inLanguage: p.locale, about: { '@id': `${url}#game` }, primaryImageOfPage: image },
    game,
    {
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ];
  if (season.window) {
    graph.push({
      '@type': 'Event',
      '@id': `${url}#event-${season.window.start}`,
      name: p.h1,
      description: p.description,
      startDate: season.window.start,
      endDate: season.window.end,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      location: { '@type': 'VirtualLocation', url },
      image,
      isAccessibleForFree: true,
      organizer: { '@type': 'Organization', name: 'LexiClash', url: LANDING_BASE_URL },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url },
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
