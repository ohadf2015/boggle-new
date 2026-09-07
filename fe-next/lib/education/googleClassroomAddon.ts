/**
 * Google Classroom Marketplace / Workspace add-on — Unplugged reteach assign.
 *
 * Smallest shippable slice toward a Workspace Marketplace listing so teachers
 * can one-click post Unplugged reteach homework (printable #957 + Live deep-link
 * #959/#968) into the Classroom Stream from inside Classroom — not only via the
 * in-app CTA (#968).
 *
 * Privacy stance (docs/2026-08-27-google-classroom-integration.md):
 * - Phase 1 share dialog remains the Stream post path (no OAuth, no roster PII).
 * - This module builds Attachment Discovery / Teacher / Student view URIs and the
 *   AddOnAttachment body shape Google expects. Creating the attachment via
 *   `courses.courseWork.addOnAttachments.create` still needs
 *   `classroom.addons.teacher` (NOT roster scopes) — deferred; Stream share is
 *   the one-click path that works today.
 *
 * Reuses #968 assign payload: Unplugged Live URL + assignment itemType + copy.
 * Class-level missed words only — never student names.
 *
 * Pure: no network, no side effects, no browser APIs. Safe on the server.
 */

import { CLASS_GAP_ORIGIN, type ClassGapShareInput, type ClassGapSharePayload } from './classGapShare';
import { buildGoogleClassroomShareUrl } from './googleClassroomShare';
import { buildUnpluggedReteachUrl } from './unpluggedReteachLive';
import { rejectStudentNames } from './chatgptReteach';

/** Marketplace Attachment Discovery URI path (iframe entry). */
export const CLASSROOM_ADDON_DISCOVERY_PATH = '/education/classroom-addon';
/** Teacher + student attachment view (same Unplugged deep-link, framed). */
export const CLASSROOM_ADDON_ATTACHMENT_PATH = '/education/classroom-addon/attachment';
/** Public Marketplace listing metadata. */
export const CLASSROOM_ADDON_MARKETPLACE_PATH = '/api/classroom-addon/marketplace';
/** Assign API — returns #968 Stream share URL from missed words. */
export const CLASSROOM_ADDON_ASSIGN_PATH = '/api/classroom-addon/assign';

export const CLASSROOM_ADDON_FRAME_ANCESTORS = [
  "'self'",
  'https://classroom.google.com',
  'https://*.classroom.google.com',
] as const;

export interface ClassroomAddonContextQuery {
  courseId?: string | null;
  itemId?: string | null;
  itemType?: string | null;
  addOnToken?: string | null;
  attachmentId?: string | null;
  login_hint?: string | null;
}

export interface ClassroomAddonAssignInput {
  missedWords: string[];
  lesson?: string;
  locale?: string;
  teacherName?: string;
  found?: number;
  total?: number;
  /** Already-localised Stream title; optional. */
  title?: string;
  /** Already-localised Stream body; optional. */
  body?: string;
}

export interface ClassroomAddonAssignResult {
  ok: true;
  unpluggedUrl: string;
  streamAssignUrl: string;
  teacherViewUri: string;
  studentViewUri: string;
  attachment: {
    title: string;
    teacherViewUri: string;
    studentViewUri: string;
  };
  student_names: false;
  marketplace_url: string;
  instructions: string;
}

export interface ClassroomAddonAssignFailure {
  ok: false;
  error: string;
}

export type ClassroomAddonAssignResponse = ClassroomAddonAssignResult | ClassroomAddonAssignFailure;

function normalizeLocale(raw?: string | null): string {
  const base = (raw || 'en').toLowerCase().split('-')[0];
  return ['en', 'he', 'sv', 'ja', 'es', 'ru'].includes(base) ? base : 'en';
}

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

function toShareInput(input: ClassroomAddonAssignInput): ClassGapShareInput {
  const missedWords = sanitizeWords(input.missedWords);
  const locale = normalizeLocale(input.locale);
  const lesson = (input.lesson || '').trim().slice(0, 80) || 'Unplugged reteach';
  const total = typeof input.total === 'number' && input.total > 0 ? input.total : missedWords.length;
  const found =
    typeof input.found === 'number' && input.found >= 0
      ? Math.min(input.found, total)
      : Math.max(0, total - missedWords.length);
  return {
    locale,
    lessonNames: [lesson],
    teacherName: (input.teacherName || '').trim().slice(0, 40),
    found,
    total,
    missedWords,
  };
}

/** Absolute Discovery URI registered in Workspace Marketplace. */
export function buildClassroomAddonDiscoveryUrl(opts?: {
  locale?: string;
  context?: ClassroomAddonContextQuery;
  payload?: ClassGapShareInput | ClassGapSharePayload;
}): string {
  const locale = normalizeLocale(opts?.locale);
  const url = new URL(`/${locale}${CLASSROOM_ADDON_DISCOVERY_PATH}`, CLASS_GAP_ORIGIN);
  const ctx = opts?.context;
  if (ctx?.courseId) url.searchParams.set('courseId', String(ctx.courseId));
  if (ctx?.itemId) url.searchParams.set('itemId', String(ctx.itemId));
  if (ctx?.itemType) url.searchParams.set('itemType', String(ctx.itemType));
  if (ctx?.addOnToken) url.searchParams.set('addOnToken', String(ctx.addOnToken));
  if (ctx?.attachmentId) url.searchParams.set('attachmentId', String(ctx.attachmentId));
  if (ctx?.login_hint) url.searchParams.set('login_hint', String(ctx.login_hint));
  if (opts?.payload) {
    const abs = buildUnpluggedReteachUrl(toClassGapShareInput(opts.payload));
    const parsed = new URL(abs);
    parsed.searchParams.forEach((v, k) => {
      if (!url.searchParams.has(k)) url.searchParams.set(k, v);
    });
  }
  return url.toString();
}

function toClassGapShareInput(
  input: ClassGapShareInput | ClassGapSharePayload | ClassroomAddonAssignInput,
): ClassGapShareInput {
  if ('lessonNames' in input) return input;
  if ('lesson' in input && typeof (input as ClassGapSharePayload).lesson === 'string' && 'teacher' in input) {
    const p = input as ClassGapSharePayload;
    return {
      locale: p.locale,
      lessonNames: p.lesson ? [p.lesson] : [],
      teacherName: p.teacher,
      found: p.found,
      total: p.total,
      missedWords: p.missedWords,
    };
  }
  return toShareInput(input as ClassroomAddonAssignInput);
}

/** Absolute Teacher/Student attachment view URI (Unplugged deep-link framed). */
export function buildClassroomAddonAttachmentUrl(
  input: ClassGapShareInput | ClassGapSharePayload | ClassroomAddonAssignInput,
): string {
  const shareInput = toClassGapShareInput(input);
  const locale = normalizeLocale(shareInput.locale);
  const unplugged = new URL(buildUnpluggedReteachUrl(shareInput));
  const url = new URL(`/${locale}${CLASSROOM_ADDON_ATTACHMENT_PATH}`, CLASS_GAP_ORIGIN);
  unplugged.searchParams.forEach((v, k) => url.searchParams.set(k, v));
  return url.toString();
}

/**
 * #968 Stream assign URL — Unplugged Live deep-link as Classroom homework.
 * Same payload the in-app CTA uses (itemtype=assignment).
 */
export function buildUnpluggedStreamAssignUrl(input: ClassroomAddonAssignInput): string {
  const shareInput = toShareInput(input);
  if (shareInput.missedWords.length === 0) {
    throw new Error('buildUnpluggedStreamAssignUrl: at least one missed word required');
  }
  const unpluggedUrl = buildUnpluggedReteachUrl(shareInput);
  const lesson = shareInput.lessonNames.join(', ') || 'class';
  const missed = shareInput.missedWords.slice(0, 8).join(', ');
  const title =
    input.title?.trim() ||
    `Unplugged reteach homework — ${lesson}`;
  const body =
    input.body?.trim() ||
    `Device-free homework: open the Unplugged Live link, print the missed-words practice sheet, and practise: ${missed}. No student devices needed — turn in when done.`;
  return buildGoogleClassroomShareUrl({
    joinUrl: unpluggedUrl,
    title,
    body,
    itemType: 'assignment',
  });
}

/**
 * AddOnAttachment body shape for `courses.courseWork.addOnAttachments.create`.
 * Teacher/student views both point at the framed Unplugged attachment URI.
 */
export function buildUnpluggedAddOnAttachment(input: ClassroomAddonAssignInput): {
  title: string;
  teacherViewUri: string;
  studentViewUri: string;
} {
  const shareInput = toShareInput(input);
  if (shareInput.missedWords.length === 0) {
    throw new Error('buildUnpluggedAddOnAttachment: at least one missed word required');
  }
  const viewUri = buildClassroomAddonAttachmentUrl(shareInput);
  const lesson = shareInput.lessonNames.join(', ') || 'class';
  return {
    title: input.title?.trim() || `Unplugged reteach — ${lesson}`,
    teacherViewUri: viewUri,
    studentViewUri: viewUri,
  };
}

/** One-shot assign: Stream share (#968) + attachment URIs for Marketplace. */
export function buildClassroomAddonAssign(body: unknown): ClassroomAddonAssignResponse {
  const nameErr = rejectStudentNames(body);
  if (nameErr) return { ok: false, error: nameErr };

  const raw = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const missed =
    raw.missed_words ?? raw.missedWords ?? raw.words ?? raw.missed ?? [];
  const input: ClassroomAddonAssignInput = {
    missedWords: sanitizeWords(missed),
    lesson: typeof raw.lesson === 'string' ? raw.lesson : undefined,
    locale: typeof raw.locale === 'string' ? raw.locale : undefined,
    teacherName: typeof raw.teacher === 'string' ? raw.teacher : undefined,
    found: typeof raw.found === 'number' ? raw.found : undefined,
    total: typeof raw.total === 'number' ? raw.total : undefined,
    title: typeof raw.title === 'string' ? raw.title : undefined,
    body: typeof raw.body === 'string' ? raw.body : undefined,
  };

  if (input.missedWords.length === 0) {
    return { ok: false, error: 'Provide at least one missed word (no student names).' };
  }

  const shareInput = toShareInput(input);
  const unpluggedUrl = buildUnpluggedReteachUrl(shareInput);
  const streamAssignUrl = buildUnpluggedStreamAssignUrl(input);
  const attachment = buildUnpluggedAddOnAttachment(input);

  return {
    ok: true,
    unpluggedUrl,
    streamAssignUrl,
    teacherViewUri: attachment.teacherViewUri,
    studentViewUri: attachment.studentViewUri,
    attachment,
    student_names: false,
    marketplace_url: `${CLASS_GAP_ORIGIN}${CLASSROOM_ADDON_MARKETPLACE_PATH}`,
    instructions:
      'Open streamAssignUrl to post Unplugged reteach homework to the Classroom Stream (printable + Live deep-link). Attachment URIs are ready for Workspace Marketplace createAddOnAttachment when classroom.addons.teacher is enabled. Never include student names.',
  };
}

/** Workspace Marketplace listing metadata (public JSON). */
export function classroomAddonMarketplaceListing(): Record<string, unknown> {
  return {
    name: 'LexiClash Unplugged Reteach',
    description:
      'One-click post Unplugged reteach homework (printable practice sheet + Live deep-link) into Google Classroom Stream. Class-level missed words only — no student names or roster import.',
    origin: CLASS_GAP_ORIGIN,
    production_url: 'https://www.lexiclash.live',
    foils: ['Discovery Education Gemini Classroom', 'Kahootopia Assignments'],
    extends: ['#949', '#954', '#957', '#959', '#968'],
    privacy: {
      student_names: false,
      roster_scopes: false,
      oauth_required_for_stream_post: false,
      notes:
        'Stream post uses Google share dialog (Phase 1). Attachment create via classroom.addons.teacher is optional and does not request classroom.rosters.readonly.',
    },
    iframes: {
      attachmentDiscoveryUri: `${CLASS_GAP_ORIGIN}/en${CLASSROOM_ADDON_DISCOVERY_PATH}`,
      teacherViewUriTemplate: `${CLASS_GAP_ORIGIN}/{locale}${CLASSROOM_ADDON_ATTACHMENT_PATH}`,
      studentViewUriTemplate: `${CLASS_GAP_ORIGIN}/{locale}${CLASSROOM_ADDON_ATTACHMENT_PATH}`,
    },
    api: {
      assign: `${CLASS_GAP_ORIGIN}${CLASSROOM_ADDON_ASSIGN_PATH}`,
      marketplace: `${CLASS_GAP_ORIGIN}${CLASSROOM_ADDON_MARKETPLACE_PATH}`,
    },
    frame_ancestors: [...CLASSROOM_ADDON_FRAME_ANCESTORS],
    stream_assign: {
      itemType: 'assignment',
      deep_link: 'unplugged-reteach',
      printable: 'missed-words practice sheet (#957)',
    },
  };
}

export function classroomAddonCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
  };
}

/** CSP value so Classroom can frame Discovery + attachment views. */
export function classroomAddonContentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co https://*.posthog.com https://eu.i.posthog.com",
    "frame-src 'self' https://classroom.google.com",
    `frame-ancestors ${CLASSROOM_ADDON_FRAME_ANCESTORS.join(' ')}`,
  ].join('; ');
}
