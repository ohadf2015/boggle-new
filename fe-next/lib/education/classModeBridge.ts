/**
 * Classroom post-game mode-bridge.
 *
 * A class or team round ends on the student's phone. Students who start a
 * second mode return; students who quit do not. This module is the offer:
 * one card, two one-tap modes, the class id carried into the next session.
 *
 * Copy lives here, not in the translation catalogues, so the change stays
 * inside the education module.
 */
export const CLASS_MODE_BRIDGE_EVENTS = {
  offered: 'class_mode_bridge_offered',
  accepted: 'class_mode_bridge_accepted',
  started: 'second_session_started',
} as const;

export type ClassBridgeMode = 'solo_daily' | 'quick_play';

const CLASS_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCALES = new Set(['en', 'he', 'es', 'sv', 'ja', 'ru']);

export interface ClassModeBridgeInput {
  isTeacher: boolean;
  classId: string | null | undefined;
  teacherName: string | null | undefined;
  /** Competition rank already computed by the results screen. Null when unknown. */
  rank: number | null;
  /** Teacher hid the leaderboard: offer the modes, never the placing. */
  hideRank: boolean;
  locale: string;
}

export interface ClassModeBridgeMode {
  id: ClassBridgeMode;
  label: string;
  href: string;
}

export interface ClassModeBridgeOffer {
  title: string;
  /** Null when the placing must not be shown. */
  context: string | null;
  modes: ClassModeBridgeMode[];
  /** The offered event. Callers add `mode` only on accept. */
  event: { class_id: string };
  /** Hebrew card. Absent means inherit the page direction. */
  dir?: 'rtl';
}

interface BridgeCopy {
  title: string;
  /** `{rank}` and `{teacher}` are filled by the caller. */
  context: string;
  soloDaily: string;
  quickPlay: string;
}

const COPY: Record<string, BridgeCopy> = {
  en: {
    title: 'Play again your way',
    context: "You were #{rank} in {teacher}'s class",
    soloDaily: 'Solo daily',
    quickPlay: 'Quick play',
  },
  he: {
    title: 'שחקו שוב בדרך שלכם',
    context: 'הייתם במקום #{rank} בכיתה של {teacher}',
    soloDaily: 'יומי לבד',
    quickPlay: 'משחק מהיר',
  },
  es: {
    title: 'Juega otra vez a tu manera',
    context: 'Quedaste #{rank} en la clase de {teacher}',
    soloDaily: 'Diario en solitario',
    quickPlay: 'Partida rápida',
  },
  sv: {
    title: 'Spela igen på ditt sätt',
    context: 'Du kom #{rank} i {teacher}s klass',
    soloDaily: 'Solo-daglig',
    quickPlay: 'Snabbspel',
  },
  ja: {
    title: '自分のやり方でもう一回',
    context: '{teacher}先生のクラスで#{rank}位でした',
    soloDaily: 'ソロ・デイリー',
    quickPlay: 'クイックプレイ',
  },
  ru: {
    title: 'Сыграйте ещё раз по-своему',
    context: 'Вы были #{rank} в классе {teacher}',
    soloDaily: 'Соло на день',
    quickPlay: 'Быстрая игра',
  },
};

export function classBridgeLocale(locale: string | null | undefined): string {
  const key = (locale || 'en').toLowerCase().split('-')[0];
  return LOCALES.has(key) ? key : 'en';
}

export function isClassId(value: string | null | undefined): value is string {
  return !!value && CLASS_ID_RE.test(value);
}

function placingRank(rank: number | null, hideRank: boolean): number | null {
  if (hideRank || rank == null) return null;
  if (!Number.isInteger(rank) || rank < 1 || rank > 999) return null;
  return rank;
}

function contextLine(copy: BridgeCopy, rank: number, teacherName: string): string {
  return copy.context.replace('{rank}', String(rank)).replace('{teacher}', teacherName);
}

/** Where the card sends the tap. The classroom page starts the session, then continues. */
export function classModeBridgeHref(locale: string, classId: string, mode: ClassBridgeMode, rank: number | null): string {
  const params = new URLSearchParams({ class_id: classId, mode });
  if (rank != null) params.set('rank', String(rank));
  return `/${classBridgeLocale(locale)}/classroom/play-again?${params.toString()}`;
}

export function classModeBridgeOffer(input: ClassModeBridgeInput): ClassModeBridgeOffer | null {
  if (input.isTeacher || !isClassId(input.classId)) return null;
  const locale = classBridgeLocale(input.locale);
  const copy = COPY[locale];
  const teacher = (input.teacherName || '').trim();
  const rank = placingRank(input.rank, input.hideRank);
  const context = rank != null && teacher ? contextLine(copy, rank, teacher) : null;
  return {
    title: copy.title,
    context,
    modes: [
      { id: 'solo_daily', label: copy.soloDaily, href: classModeBridgeHref(locale, input.classId, 'solo_daily', rank) },
      { id: 'quick_play', label: copy.quickPlay, href: classModeBridgeHref(locale, input.classId, 'quick_play', rank) },
    ],
    event: { class_id: input.classId },
    dir: locale === 'he' ? 'rtl' : undefined,
  };
}

export interface ClassModeBridgeStart {
  classId: string;
  mode: ClassBridgeMode;
  rank: number | null;
}

export function parseClassModeBridgeStart(search: string): ClassModeBridgeStart | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const classId = params.get('class_id');
  const mode = params.get('mode');
  if (!isClassId(classId)) return null;
  if (mode !== 'solo_daily' && mode !== 'quick_play') return null;
  const rawRank = params.get('rank');
  const rank = rawRank && /^\d{1,3}$/.test(rawRank) ? Number(rawRank) : null;
  return { classId, mode, rank: rank != null && rank >= 1 ? rank : null };
}

/**
 * The second session itself. Solo daily is the consumer daily hub, marked
 * academy so a classroom phone stays ad-free. Quick play stays on the
 * student path, which already keeps classroom chrome.
 */
export function secondSessionHref(locale: string, start: ClassModeBridgeStart): string {
  const lang = classBridgeLocale(locale);
  const classId = encodeURIComponent(start.classId);
  if (start.mode === 'solo_daily') {
    return `/${lang}/daily?academy=1&class_id=${classId}&from=class_mode_bridge`;
  }
  return `/${lang}/student/quick-play?class_id=${classId}&from=class_mode_bridge`;
}

const STORAGE_KEY = 'lc.classModeBridge';

export interface RememberedClassBridge {
  classId: string;
  mode: ClassBridgeMode;
  rank: number | null;
}

/** The second session reads this if a later navigation drops the query. */
export function rememberClassModeBridge(start: ClassModeBridgeStart, storage: Pick<Storage, 'setItem'> | null): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ classId: start.classId, mode: start.mode, rank: start.rank }));
  } catch {
    /* private mode: the URL still carries the class */
  }
}

export function readClassModeBridge(storage: Pick<Storage, 'getItem'> | null): RememberedClassBridge | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RememberedClassBridge>;
    if (!isClassId(parsed.classId)) return null;
    if (parsed.mode !== 'solo_daily' && parsed.mode !== 'quick_play') return null;
    return { classId: parsed.classId, mode: parsed.mode, rank: typeof parsed.rank === 'number' ? parsed.rank : null };
  } catch {
    return null;
  }
}
