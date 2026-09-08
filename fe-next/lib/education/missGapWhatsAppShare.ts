/**
 * Parent / WhatsApp shareable miss-gap practice card — next layer after
 * #975 async homework + #977 GC grade passback.
 *
 * Foil: Kahoot / Classroom grade sync stops at the gradebook. LexiClash
 * one-taps the #972 miss-gap practice card into WhatsApp for parents
 * (class-level words only — never student names). Reuses practice URL +
 * due date from the async assignment payload.
 *
 * Out of scope: #967 teacher-p0, drafts #871/#867/#865/#864/#863/#826,
 * live Unplugged / Marketplace OAuth (#970 kept as-is).
 */

import {
  CLASS_GAP_ORIGIN,
  normalizeLocale,
  type ClassGapSharePayload,
} from './classGapShare';
import {
  toMissGapAssignmentPayload,
  type MissGapAssignmentInput,
  type MissGapAssignmentPayload,
} from './missGapAsyncAssignment';
import { buildMissGapPracticeOgImageUrl } from './missGapPracticeShare';

export const MISS_GAP_WHATSAPP_PATH = '/education/miss-gap-whatsapp';

/** UTM so parent WhatsApp unfurls are attributable in growth. */
export const MISS_GAP_WHATSAPP_UTM = {
  utm_source: 'whatsapp',
  utm_medium: 'parent',
  utm_campaign: 'miss_gap_practice',
} as const;

export type MissGapWhatsAppShareInput =
  | MissGapAssignmentInput
  | MissGapAssignmentPayload
  | ClassGapSharePayload;

function applyCardParams(url: URL, payload: MissGapAssignmentPayload): void {
  if (payload.lesson) url.searchParams.set('lesson', payload.lesson);
  if (payload.teacher) url.searchParams.set('teacher', payload.teacher);
  url.searchParams.set('found', String(payload.found));
  url.searchParams.set('total', String(payload.total));
  if (payload.missedWords.length > 0) {
    url.searchParams.set('missed', payload.missedWords.join(','));
  }
  url.searchParams.set('lang', payload.locale);
  if (payload.dueDate) url.searchParams.set('due', payload.dueDate);
  url.searchParams.set('utm_source', MISS_GAP_WHATSAPP_UTM.utm_source);
  url.searchParams.set('utm_medium', MISS_GAP_WHATSAPP_UTM.utm_medium);
  url.searchParams.set('utm_campaign', MISS_GAP_WHATSAPP_UTM.utm_campaign);
}

/**
 * Absolute parent card URL on lexiclash.live — WhatsApp unfurl destination.
 * Class-level missed words + optional due; never student names.
 */
export function buildMissGapWhatsAppCardShareUrl(
  input: MissGapWhatsAppShareInput,
): string {
  const payload = toMissGapAssignmentPayload(input);
  const url = new URL(
    `/${payload.locale}${MISS_GAP_WHATSAPP_PATH}`,
    CLASS_GAP_ORIGIN,
  );
  applyCardParams(url, payload);
  return url.toString();
}

/** Relative in-app path for Link hrefs. */
export function buildMissGapWhatsAppCardPath(
  input: MissGapWhatsAppShareInput,
): string {
  const payload = toMissGapAssignmentPayload(input);
  const url = new URL(
    `/${payload.locale}${MISS_GAP_WHATSAPP_PATH}`,
    'https://local.invalid',
  );
  applyCardParams(url, payload);
  return `${url.pathname}${url.search}`;
}

/** OG image — reuse #972 miss-gap practice art (same class words). */
export function buildMissGapWhatsAppOgImageUrl(
  input: MissGapWhatsAppShareInput,
): string {
  const payload = toMissGapAssignmentPayload(input);
  return buildMissGapPracticeOgImageUrl(payload);
}

/**
 * WhatsApp deep link (`wa.me`) with prefilled parent message + card URL.
 * Callers pass already-translated `text` (no i18n in this module).
 */
export function buildMissGapWhatsAppDeepLink(args: {
  text: string;
  /** Defaults to the parent card share URL when omitted. */
  url?: string;
  input?: MissGapWhatsAppShareInput;
}): string {
  const cardUrl =
    args.url ||
    (args.input ? buildMissGapWhatsAppCardShareUrl(args.input) : '');
  const body = cardUrl
    ? `${String(args.text || '').trim()}\n${cardUrl}`.trim()
    : String(args.text || '').trim();
  return `https://wa.me/?text=${encodeURIComponent(body)}`;
}

export function missGapWhatsAppLocalePath(locale: string): string {
  return `/${normalizeLocale(locale)}${MISS_GAP_WHATSAPP_PATH}`;
}

/** True when there is something worth sending to a parent chat. */
export function canShareMissGapWhatsApp(
  input: MissGapWhatsAppShareInput,
): boolean {
  const payload = toMissGapAssignmentPayload(input);
  return payload.missedWords.length > 0;
}
