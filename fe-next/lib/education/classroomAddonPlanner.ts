/**
 * Conversational Google Classroom add-on planner.
 *
 * Teacher types plain language ("Unplugged reteach on yesterday's misses",
 * "3-min Live on CEFR gaps", "Classic Unplugged with the class", "Team Tiles
 * for two groups") and we route into existing Classic / Team Unplugged or
 * reteach Live + #1045 grade passback — without reopening Unplugged game
 * logic. Foils Discovery Education Gemini conversational Classroom.
 *
 * Pure: no network, no side effects. Safe on the server.
 */

import { rejectStudentNames } from './chatgptReteach';
import {
  CLASS_GAP_ORIGIN,
  CLASS_GAP_RETEACH_TIMER_SECONDS,
  normalizeLocale,
  toClassGapPayload,
  type ClassGapShareInput,
} from './classGapShare';
import { buildClassicUnpluggedPath, buildClassicUnpluggedUrl } from './classicUnplugged';
import { CEFR_LEVELS, cefrList, type CefrLevel } from './eslCefrDemo';
import {
  CLASSROOM_ADDON_ASSIGN_PATH,
  CLASSROOM_ADDON_DISCOVERY_PATH,
  CLASSROOM_ADDON_MARKETPLACE_PATH,
  buildUnpluggedStreamAssignUrl,
  type ClassroomAddonContextQuery,
} from './googleClassroomAddon';
import { buildTeamTilesUnpluggedPath, buildTeamTilesUnpluggedUrl } from './teamTilesUnplugged';
import {
  UNPLUGGED_GRADE_PASSBACK_API_PATH,
  buildUnpluggedGradePassbackShareUrl,
} from './unpluggedReteachGradePassback';
import {
  buildUnpluggedReteachPath,
  buildUnpluggedReteachUrl,
} from './unpluggedReteachLive';

/** Marketplace / Discovery conversational planner iframe path. */
export const CLASSROOM_ADDON_PLANNER_PATH = '/education/classroom-addon/planner';
/** Plan API — POST prompt (+ optional missed words) → routed Live + grade passback. */
export const CLASSROOM_ADDON_PLAN_API_PATH = '/api/classroom-addon/plan';

export const CLASSROOM_ADDON_PLANNER_FOIL =
  'Discovery Education Gemini conversational Classroom';

export type ClassroomAddonPlanMode =
  | 'classic_unplugged'
  | 'team_tiles_unplugged'
  | 'unplugged_reteach'
  | 'reteach_live_3min';

export interface ClassroomAddonPlanInput {
  prompt?: string | null;
  missedWords?: string[];
  lesson?: string;
  locale?: string;
  cefr?: string | null;
  teacherName?: string;
  found?: number;
  total?: number;
  context?: ClassroomAddonContextQuery;
}

export interface ClassroomAddonPlanSuccess {
  ok: true;
  mode: ClassroomAddonPlanMode;
  rationale: string;
  prompt: string;
  lesson: string;
  locale: string;
  missed_words: string[];
  timer_seconds: number | null;
  cefr_level: CefrLevel | null;
  liveUrl: string;
  livePath: string;
  streamAssignUrl: string | null;
  gradePassbackUrl: string;
  gradePassbackApi: string;
  student_names: false;
  roster_scopes: false;
  foil: typeof CLASSROOM_ADDON_PLANNER_FOIL;
  foils: string[];
  marketplace_url: string;
  discovery_url: string;
  instructions: string;
}

export interface ClassroomAddonPlanFailure {
  ok: false;
  error: string;
}

export type ClassroomAddonPlanResult =
  | ClassroomAddonPlanSuccess
  | ClassroomAddonPlanFailure;

function sanitizeWords(words: unknown): string[] {
  const list = Array.isArray(words)
    ? words
    : typeof words === 'string'
      ? words.split(/[,;\n]+/)
      : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    const word = String(raw ?? '')
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 32);
    if (!word) continue;
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(word);
    if (out.length >= 12) break;
  }
  return out;
}

function normalizePrompt(raw?: string | null): string {
  return String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 280);
}

function detectCefr(prompt: string, explicit?: string | null): CefrLevel | null {
  const fromExplicit = String(explicit ?? '')
    .trim()
    .toUpperCase();
  if ((CEFR_LEVELS as readonly string[]).includes(fromExplicit)) {
    return fromExplicit as CefrLevel;
  }
  const m = prompt.match(/\b(A1|A2|B1)\b/i);
  if (m) return m[1].toUpperCase() as CefrLevel;
  if (/\bcefr\b/i.test(prompt) || /\bgaps?\b/i.test(prompt)) return 'A2';
  return null;
}

/**
 * Priority: Team Tiles → Classic → 3-min/CEFR Live → Unplugged reteach (default).
 * Never invents new game logic — only picks among shipped modes.
 */
export function detectClassroomAddonPlanMode(
  prompt: string,
): ClassroomAddonPlanMode {
  const p = prompt.toLowerCase();

  if (
    /\bteam\s*tiles?\b/.test(p) ||
    /\btileboard\b/.test(p) ||
    /\bteams?\b/.test(p) ||
    /\bgrupos?\b/.test(p) ||
    /\bקבוצ/.test(prompt)
  ) {
    return 'team_tiles_unplugged';
  }

  if (
    /\bclassic\s*unplugged\b/.test(p) ||
    /\bclassic\b/.test(p) ||
    /\bclass\s+(discuss|consensus|submit)\b/.test(p) ||
    /\bshared[- ]?screen\b/.test(p) ||
    /\bklaas\b/.test(p)
  ) {
    return 'classic_unplugged';
  }

  if (
    /\b3[\s-]?min(ute)?s?\b/.test(p) ||
    /\bthree[\s-]?minute\b/.test(p) ||
    /\b180\s*s(ec(onds?)?)?\b/.test(p) ||
    /\bcefr\b/.test(p) ||
    (/\blive\b/.test(p) && /\bgaps?\b/.test(p))
  ) {
    return 'reteach_live_3min';
  }

  if (
    /\bunplugged\b/.test(p) ||
    /\breteach\b/.test(p) ||
    /\byesterday\b/.test(p) ||
    /\bmiss(es|ed)?\b/.test(p) ||
    /\bprintable\b/.test(p) ||
    /\bhomework\b/.test(p)
  ) {
    return 'unplugged_reteach';
  }

  return 'unplugged_reteach';
}

function rationaleFor(mode: ClassroomAddonPlanMode, cefr: CefrLevel | null): string {
  switch (mode) {
    case 'team_tiles_unplugged':
      return 'Routed to Team Tiles Unplugged (shared teacher-screen tileboard) + grade passback.';
    case 'classic_unplugged':
      return 'Routed to Classic Unplugged (class/teams discuss on the projector) + grade passback.';
    case 'reteach_live_3min':
      return cefr
        ? `Routed to 3-min reteach Live on CEFR ${cefr} gaps + grade passback.`
        : 'Routed to 3-min reteach Live + grade passback.';
    case 'unplugged_reteach':
    default:
      return 'Routed to Unplugged reteach Live (printable + projector) + grade passback.';
  }
}

function toShareInput(args: {
  missedWords: string[];
  lesson: string;
  locale: string;
  teacherName?: string;
  found?: number;
  total?: number;
}): ClassGapShareInput {
  const total =
    typeof args.total === 'number' && args.total > 0
      ? args.total
      : args.missedWords.length;
  const found =
    typeof args.found === 'number' && args.found >= 0
      ? Math.min(args.found, total)
      : Math.max(0, total - args.missedWords.length);
  return {
    locale: normalizeLocale(args.locale),
    lessonNames: [args.lesson],
    teacherName: (args.teacherName || '').trim().slice(0, 40),
    found,
    total,
    missedWords: args.missedWords,
  };
}

/** Absolute Discovery planner URI (Marketplace iframe entry). */
export function buildClassroomAddonPlannerUrl(opts?: {
  locale?: string;
  context?: ClassroomAddonContextQuery;
  prompt?: string;
}): string {
  const locale = normalizeLocale(opts?.locale || 'en');
  const url = new URL(`/${locale}${CLASSROOM_ADDON_PLANNER_PATH}`, CLASS_GAP_ORIGIN);
  const ctx = opts?.context;
  if (ctx?.courseId) url.searchParams.set('courseId', String(ctx.courseId));
  if (ctx?.itemId) url.searchParams.set('itemId', String(ctx.itemId));
  if (ctx?.itemType) url.searchParams.set('itemType', String(ctx.itemType));
  if (ctx?.addOnToken) url.searchParams.set('addOnToken', String(ctx.addOnToken));
  if (ctx?.attachmentId) url.searchParams.set('attachmentId', String(ctx.attachmentId));
  if (ctx?.login_hint) url.searchParams.set('login_hint', String(ctx.login_hint));
  if (opts?.prompt) url.searchParams.set('prompt', normalizePrompt(opts.prompt));
  return url.toString();
}

/**
 * One-shot plan: plain-language prompt → Classic / Team Unplugged or reteach
 * Live deep-link + grade passback receipt. Class-level missed words only.
 */
export function buildClassroomAddonPlan(body: unknown): ClassroomAddonPlanResult {
  const nameErr = rejectStudentNames(body);
  if (nameErr) return { ok: false, error: nameErr };

  const raw = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const prompt = normalizePrompt(
    typeof raw.prompt === 'string'
      ? raw.prompt
      : typeof raw.query === 'string'
        ? raw.query
        : typeof raw.text === 'string'
          ? raw.text
          : '',
  );

  if (!prompt) {
    return {
      ok: false,
      error:
        'Provide a plain-language prompt (e.g. "Unplugged reteach on yesterday\'s misses" or "3-min Live on CEFR gaps").',
    };
  }

  const mode = detectClassroomAddonPlanMode(prompt);
  const cefr = detectCefr(
    prompt,
    typeof raw.cefr === 'string'
      ? raw.cefr
      : typeof raw.cefr_level === 'string'
        ? raw.cefr_level
        : null,
  );

  let missed = sanitizeWords(
    raw.missed_words ?? raw.missedWords ?? raw.words ?? raw.missed ?? [],
  );
  if (missed.length === 0 && cefr) {
    missed = cefrList(cefr).slice(0, 8);
  }
  if (missed.length === 0) {
    return {
      ok: false,
      error:
        'Provide at least one missed word (class-level only), or ask for a CEFR level so we can seed gap words.',
    };
  }

  const locale = normalizeLocale(
    typeof raw.locale === 'string'
      ? raw.locale
      : typeof raw.lang === 'string'
        ? raw.lang
        : 'en',
  );
  const lesson =
    (typeof raw.lesson === 'string' ? raw.lesson : '').trim().slice(0, 80) ||
    (mode === 'reteach_live_3min' && cefr
      ? `CEFR ${cefr} gaps`
      : mode === 'classic_unplugged'
        ? 'Classic Unplugged'
        : mode === 'team_tiles_unplugged'
          ? 'Team Tiles Unplugged'
          : 'Unplugged reteach');

  const shareInput = toShareInput({
    missedWords: missed,
    lesson,
    locale,
    teacherName: typeof raw.teacher === 'string' ? raw.teacher : undefined,
    found: typeof raw.found === 'number' ? raw.found : undefined,
    total: typeof raw.total === 'number' ? raw.total : undefined,
  });
  const payload = toClassGapPayload(shareInput);

  let liveUrl: string;
  let livePath: string;
  let timer_seconds: number | null = null;

  switch (mode) {
    case 'classic_unplugged':
      liveUrl = buildClassicUnpluggedUrl(payload);
      livePath = buildClassicUnpluggedPath(payload);
      break;
    case 'team_tiles_unplugged':
      liveUrl = buildTeamTilesUnpluggedUrl(payload);
      livePath = buildTeamTilesUnpluggedPath(payload);
      break;
    case 'reteach_live_3min':
      liveUrl = buildUnpluggedReteachUrl(payload);
      livePath = buildUnpluggedReteachPath(payload);
      timer_seconds = CLASS_GAP_RETEACH_TIMER_SECONDS;
      break;
    case 'unplugged_reteach':
    default:
      liveUrl = buildUnpluggedReteachUrl(payload);
      livePath = buildUnpluggedReteachPath(payload);
      break;
  }

  const gradePassbackUrl = buildUnpluggedGradePassbackShareUrl({
    input: shareInput,
    context:
      raw.context && typeof raw.context === 'object'
        ? (raw.context as ClassroomAddonContextQuery)
        : undefined,
  });

  let streamAssignUrl: string | null = null;
  try {
    // Stream assign still deep-links Unplugged reteach homework (#968 / #970).
    streamAssignUrl = buildUnpluggedStreamAssignUrl({
      missedWords: missed,
      lesson,
      locale,
      teacherName: typeof raw.teacher === 'string' ? raw.teacher : undefined,
      found: shareInput.found,
      total: shareInput.total,
    });
  } catch {
    streamAssignUrl = null;
  }

  return {
    ok: true,
    mode,
    rationale: rationaleFor(mode, cefr),
    prompt,
    lesson,
    locale,
    missed_words: missed,
    timer_seconds,
    cefr_level: cefr,
    liveUrl,
    livePath,
    streamAssignUrl,
    gradePassbackUrl,
    gradePassbackApi: `${CLASS_GAP_ORIGIN}${UNPLUGGED_GRADE_PASSBACK_API_PATH}`,
    student_names: false,
    roster_scopes: false,
    foil: CLASSROOM_ADDON_PLANNER_FOIL,
    foils: [
      CLASSROOM_ADDON_PLANNER_FOIL,
      'Kahoot Classic:Unplugged',
      'Kahoot Team Tiles',
      'Kahoot Classroom add-on grade passback',
    ],
    marketplace_url: `${CLASS_GAP_ORIGIN}${CLASSROOM_ADDON_MARKETPLACE_PATH}`,
    discovery_url: `${CLASS_GAP_ORIGIN}/${locale}${CLASSROOM_ADDON_DISCOVERY_PATH}`,
    instructions:
      'Open liveUrl on the teacher projector (Classic / Team Unplugged or reteach Live). After finish, open gradePassbackUrl for #1045 class-level cleared/total passback. Optional streamAssignUrl posts Unplugged homework to the Classroom Stream. Never include student names.',
  };
}

/** Marketplace metadata slice for the conversational planner. */
export function classroomAddonPlannerListingSlice(): Record<string, unknown> {
  return {
    for: 'conversational-classroom-addon-planner',
    foil: CLASSROOM_ADDON_PLANNER_FOIL,
    path: CLASSROOM_ADDON_PLANNER_PATH,
    api: CLASSROOM_ADDON_PLAN_API_PATH,
    routes_into: [
      'classic-unplugged',
      'team-tiles-unplugged',
      'unplugged-reteach',
      'unplugged-grade-passback (#1045)',
    ],
    example_prompts: [
      "Unplugged reteach on yesterday's misses",
      '3-min Live on CEFR gaps',
      'Classic Unplugged with the class',
      'Team Tiles for two groups',
    ],
    student_names: false,
    roster_scopes: false,
    reopens_unplugged_game_logic: false,
    extends: ['#959', '#970', '#1045', '#1047', '#1058'],
    notes:
      'Plain-language teacher prompt in the Classroom add-on routes into shipped Classic/Team Unplugged or reteach Live + grade passback. No new Unplugged game logic.',
    assign_api: CLASSROOM_ADDON_ASSIGN_PATH,
  };
}
