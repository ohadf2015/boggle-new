/**
 * welcomeModes — the dynamic mode grid for the welcome email.
 *
 * SINGLE SOURCE OF TRUTH is `MODE_META` (the same registry the landing cubes
 * render): the email surfaces every PUBLIC mode (i.e. not `badge:'ADMIN'`),
 * with its canonical localized title, route, and generated cube image — so a
 * new public mode appears in the email automatically, with the right art and
 * link, and never drifts from the landing page.
 *
 * Two deliberate deviations from a raw registry dump:
 *  - `daily` is added (it lives outside MODE_META — it renders as a banner on
 *    the landing, but it IS a player-facing mode and belongs in the email).
 *  - `adventure` is omitted: it is a public route but the landing intentionally
 *    keeps it out of FEATURED_MODES (and it is mid-rework), so the email mirrors
 *    the landing's promoted public set rather than every reachable route.
 *  - `crossword` (תשבץ) is omitted: it is not yet public to all players, so it
 *    must not be promoted in the welcome / re-engagement emails until it ships
 *    broadly. Re-add it here when it goes fully public.
 *
 * Titles come from the registry's i18n keys (localized via `translateKey`).
 * Taglines are curated per-language email copy (tighter than the landing descs,
 * sized for a tile); any unmapped mode falls back to its registry descKey.
 */
import { MODE_META } from '@/lib/landing/modeMeta';
import { translateKey } from '@/lib/i18n/serverTranslate';

export interface WelcomeEmailMode {
  readonly key: string;
  readonly title: string;
  readonly tagline: string;
  /** absolute, language-prefixed link to the mode */
  readonly href: string;
  /** absolute URL to the generated cube image (carries all the colour) */
  readonly cubeImageUrl: string;
}

/**
 * The promoted public set, in email order. Mirrors the landing FEATURED_MODES
 * minus admin-gated modes, minus `adventure`, and minus `crossword` (not yet
 * public to all players). `daily` leads after arena as the habit hook.
 */
export const PUBLIC_WELCOME_MODE_ORDER = [
  'arena',
  'daily',
  'blast',
  'connections',
  'wordCraft',
  'brainGym',
  'practice',
] as const;

/** `daily` is not in MODE_META (it renders as a banner) — its email metadata. */
const DAILY = {
  titleKey: 'landing.dailyChallenge',
  path: '/daily',
  cubeImage: '/modes/cubes/daily.png',
} as const;

/** Curated, tile-sized taglines per language. Falls back to the registry desc. */
const TAGLINES: Record<string, Record<string, string>> = {
  en: {
    arena: 'Live brawls, real people',
    daily: 'One puzzle. Everyone.',
    blast: 'Combo till it pops',
    connections: 'Spot the hidden links',
    wordCraft: 'Claim turf with words',
    brainGym: 'Train your word brain',
    crossword: 'Fill the grid, clue by clue',
    practice: 'No clock, just words',
  },
  he: {
    arena: 'קרבות חיים מול אנשים',
    daily: 'חידה אחת. כולם.',
    blast: 'קומבו עד שמתפוצץ',
    connections: 'למצוא את הקשרים',
    wordCraft: 'לכבוש שטח עם מילים',
    brainGym: 'אימון למוח המילים',
    crossword: 'למלא את הרשת, רמז אחרי רמז',
    practice: 'בלי שעון, רק מילים',
  },
  sv: {
    arena: 'Live mot riktiga spelare',
    daily: 'Ett pussel. Alla.',
    blast: 'Kedja tills det smäller',
    connections: 'Hitta dolda kopplingar',
    wordCraft: 'Erövra mark med ord',
    brainGym: 'Träna din ordhjärna',
    crossword: 'Fyll rutnätet, ledtråd för ledtråd',
    practice: 'Ingen klocka, bara ord',
  },
  ja: {
    arena: '生バトル、相手は本物',
    daily: '一つの問題、みんなで',
    blast: '連鎖で大爆発',
    connections: '隠れた繋がりを探せ',
    wordCraft: '言葉で陣地を奪え',
    brainGym: '言葉の脳を鍛えろ',
    crossword: 'マスを埋めろ、ヒントごとに',
    practice: '時間制限なし、言葉だけ',
  },
  es: {
    arena: 'Duelos en vivo, gente real',
    daily: 'Un reto. Todos.',
    blast: 'Combos hasta reventar',
    connections: 'Halla los grupos ocultos',
    wordCraft: 'Conquista con palabras',
    brainGym: 'Entrena tu cerebro verbal',
    crossword: 'Llena la cuadrícula, pista a pista',
    practice: 'Sin reloj, solo palabras',
  },
  ru: {
    arena: 'Живые поединки с реальными игроками',
    daily: 'Одна загадка. Для всех.',
    blast: 'Комбо до взрыва',
    connections: 'Найди скрытые связи',
    wordCraft: 'Завоёвывай территорию словами',
    brainGym: 'Тренируй словесный мозг',
    crossword: 'Заполняй сетку, подсказку за подсказкой',
    practice: 'Без времени, только слова',
  },
};

function tagline(key: string, language: string, descKey: string): string {
  return (
    TAGLINES[language]?.[key] ??
    TAGLINES.en[key] ??
    translateKey(descKey, language, '')
  );
}

/**
 * Build the localized, link-ready mode list for the welcome email.
 * @param language one of en|he|sv|ja|es (anything else resolves to en copy)
 * @param baseUrl  asset/link origin, e.g. https://www.lexiclash.live
 */
export function getWelcomeEmailModes(language: string, baseUrl: string): WelcomeEmailMode[] {
  const modes: WelcomeEmailMode[] = [];

  for (const key of PUBLIC_WELCOME_MODE_ORDER) {
    if (key === 'daily') {
      modes.push({
        key,
        title: translateKey(DAILY.titleKey, language, 'Daily Challenge'),
        tagline: tagline(key, language, ''),
        href: `${baseUrl}/${language}${DAILY.path}`,
        cubeImageUrl: `${baseUrl}${DAILY.cubeImage}`,
      });
      continue;
    }

    const meta = MODE_META[key];
    // Defensive: never surface an admin mode even if the order list changes.
    if (!meta || meta.badge === 'ADMIN' || !meta.genIcon) continue;

    modes.push({
      key,
      title: translateKey(meta.titleKey, language, key),
      tagline: tagline(key, language, meta.descKey),
      href: `${baseUrl}/${language}${meta.path}`,
      cubeImageUrl: `${baseUrl}${meta.genIcon}`,
    });
  }

  return modes;
}
