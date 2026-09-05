/**
 * ChatGPT Action → 3-min reteach Live.
 *
 * Kahoot launched a free ChatGPT app on 2026-09-03 (quiz generation).
 * This Action is the wedge they cannot copy from a chat transcript: take
 * missed words from ChatGPT materials and create or host a 3-minute
 * reteach Live. Class-level only — no student accounts, no student names.
 *
 * Reuses class-gap share URL (#899) + lessonGameData reteach shape (#896)
 * + fixed 180s Live timer (#949).
 */

import {
  CLASS_GAP_ORIGIN,
  CLASS_GAP_RETEACH_TIMER_SECONDS,
  buildClassGapShareUrl,
  normalizeLocale,
  toClassGapPayload,
  type ClassGapLocale,
  type ClassGapSharePayload,
} from './classGapShare';

export const CHATGPT_RETEACH_TIMER_SECONDS = CLASS_GAP_RETEACH_TIMER_SECONDS;
export const CHATGPT_ACTION_OPENAPI_PATH = '/api/chatgpt/openapi.yaml';
export const CHATGPT_RETEACH_PATH = '/education/chatgpt-reteach';

export type ChatGptReteachAction = 'create' | 'host';

export interface ChatGptReteachInput {
  missed_words?: unknown;
  missedWords?: unknown;
  words?: unknown;
  lesson?: unknown;
  locale?: unknown;
  action?: unknown;
  student_name?: unknown;
  student_names?: unknown;
  studentName?: unknown;
  studentNames?: unknown;
  names?: unknown;
  students?: unknown;
  roster?: unknown;
  roster_names?: unknown;
  emails?: unknown;
  student_emails?: unknown;
}

export interface ChatGptReteachSuccess {
  ok: true;
  action: ChatGptReteachAction;
  timer_seconds: number;
  missed_words: string[];
  lesson: string;
  locale: ClassGapLocale;
  share_url: string;
  host_url: string;
  openapi_url: string;
  student_accounts: false;
  student_names: false;
  instructions: string;
}

export interface ChatGptReteachFailure {
  ok: false;
  error: string;
}

export type ChatGptReteachResult = ChatGptReteachSuccess | ChatGptReteachFailure;

const FORBIDDEN_NAME_KEYS = [
  'student_name',
  'student_names',
  'studentName',
  'studentNames',
  'names',
  'students',
  'roster',
  'roster_names',
  'emails',
  'student_emails',
] as const;

function isPresent(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  return true;
}

export function rejectStudentNames(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const rec = body as Record<string, unknown>;
  for (const key of FORBIDDEN_NAME_KEYS) {
    if (isPresent(rec[key])) {
      return 'Student names are not accepted. Send missed words only — class-level reteach, no roster.';
    }
  }
  return null;
}

function asWordList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((w) => String(w ?? ''));
  }
  if (typeof value === 'string') {
    return value.split(/[,;\n]+/);
  }
  return [];
}

function parseAction(value: unknown): ChatGptReteachAction {
  return value === 'host' ? 'host' : 'create';
}

export function chatgptCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
  };
}

export function toChatGptSharePayload(input: ChatGptReteachInput): ClassGapSharePayload {
  const words = asWordList(input.missed_words ?? input.missedWords ?? input.words);
  const locale = normalizeLocale(typeof input.locale === 'string' ? input.locale : 'en');
  const lesson = typeof input.lesson === 'string' ? input.lesson : 'ChatGPT reteach';
  return toClassGapPayload({
    locale,
    lessonNames: [lesson],
    // Never carry a person name on the ChatGPT Action path.
    teacherName: '',
    found: 0,
    total: words.length,
    missedWords: words,
  });
}

export function buildChatGptShareUrl(payload: ClassGapSharePayload): string {
  return buildClassGapShareUrl({
    locale: payload.locale,
    lessonNames: payload.lesson ? [payload.lesson] : [],
    teacherName: '',
    found: payload.found,
    total: payload.total,
    missedWords: payload.missedWords,
  });
}

/** Dedicated host landing: stages lessonGameData then opens a NEW 3-min Live. */
export function buildChatGptHostUrl(payload: ClassGapSharePayload): string {
  const url = new URL(`/${payload.locale}${CHATGPT_RETEACH_PATH}`, CLASS_GAP_ORIGIN);
  if (payload.lesson) url.searchParams.set('lesson', payload.lesson);
  url.searchParams.set('found', String(payload.found));
  url.searchParams.set('total', String(payload.total));
  if (payload.missedWords.length > 0) {
    url.searchParams.set('missed', payload.missedWords.join(','));
  }
  url.searchParams.set('lang', payload.locale);
  url.searchParams.set('autostart', '1');
  return url.toString();
}

export function buildChatGptReteach(body: unknown): ChatGptReteachResult {
  const nameErr = rejectStudentNames(body);
  if (nameErr) return { ok: false, error: nameErr };

  const raw = body && typeof body === 'object' ? (body as ChatGptReteachInput) : {};
  const action = parseAction(raw.action);
  const payload = toChatGptSharePayload(raw);

  if (payload.missedWords.length === 0) {
    return { ok: false, error: 'Provide at least one missed word (no student names).' };
  }

  const shareUrl = buildChatGptShareUrl(payload);
  const hostUrl = buildChatGptHostUrl(payload);

  return {
    ok: true,
    action,
    timer_seconds: CHATGPT_RETEACH_TIMER_SECONDS,
    missed_words: payload.missedWords,
    lesson: payload.lesson,
    locale: payload.locale,
    share_url: shareUrl,
    host_url: hostUrl,
    openapi_url: `${CLASS_GAP_ORIGIN}${CHATGPT_ACTION_OPENAPI_PATH}`,
    student_accounts: false,
    student_names: false,
    instructions:
      action === 'host'
        ? 'Open host_url to start a 3-minute reteach Live seeded with the missed words. Share share_url with the class. No student accounts or names.'
        : 'Share share_url (class-gap card). Anyone who opens it can start a 3-minute reteach Live. Open host_url to host immediately. No student accounts or names.',
  };
}

export function chatgptActionOpenApiYaml(): string {
  return `openapi: 3.0.1
info:
  title: LexiClash ChatGPT Action — 3-min reteach Live
  description: |
    Turn ChatGPT lesson materials (missed words from homework, a vocab list,
    a recap) into a 3-minute LexiClash reteach Live. Teachers and students
    can create a share link or host immediately.

    NEVER send student names, rosters, emails, or account identifiers.
    Send missed words only. No student accounts are required.
  version: "1.0.0"
  contact:
    name: LexiClash
    url: https://www.lexiclash.live
servers:
  - url: https://www.lexiclash.live
paths:
  /api/chatgpt/reteach:
    get:
      operationId: describeReteachAction
      summary: Describe the ChatGPT reteach Action
      description: Confirm the Action is live and return the OpenAPI URL. No student data.
      responses:
        "200":
          description: Action metadata
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ReteachDescribe"
    post:
      operationId: createOrHostReteachLive
      summary: Create or host a 3-min reteach Live
      description: |
        Create a class-gap share card and a host URL for a 3-minute reteach Live
        seeded with missed words from ChatGPT materials. Use action=create when
        the teacher wants a link to share. Use action=host when they want to
        start the Live room now. Do not include student names.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ReteachRequest"
            examples:
              createFromMaterials:
                summary: Share a reteach from a missed-word list
                value:
                  missed_words:
                    - photosynthesis
                    - chlorophyll
                  lesson: Unit 4 plants
                  locale: en
                  action: create
              hostNow:
                summary: Host a 3-min reteach Live now
                value:
                  missed_words:
                    - neutron
                    - quark
                  lesson: Physics 101
                  action: host
      responses:
        "200":
          description: Share and host URLs for the 3-min reteach Live
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ReteachSuccess"
        "400":
          description: Missing words or student names were sent
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ReteachFailure"
components:
  schemas:
    ReteachRequest:
      type: object
      required:
        - missed_words
      properties:
        missed_words:
          type: array
          description: Class-level words nobody found. Never student names.
          minItems: 1
          maxItems: 12
          items:
            type: string
            maxLength: 32
        lesson:
          type: string
          description: Lesson title only. Do not put a person name here.
          maxLength: 80
        locale:
          type: string
          description: "One of en, he, sv, ja, es, ru. Defaults to en."
          enum:
            - en
            - he
            - sv
            - ja
            - es
            - ru
        action:
          type: string
          description: create returns a share card; host is for starting Live now.
          enum:
            - create
            - host
          default: create
    ReteachSuccess:
      type: object
      properties:
        ok:
          type: boolean
          enum:
            - true
        action:
          type: string
          enum:
            - create
            - host
        timer_seconds:
          type: integer
          enum:
            - 180
        missed_words:
          type: array
          items:
            type: string
        lesson:
          type: string
        locale:
          type: string
        share_url:
          type: string
          format: uri
        host_url:
          type: string
          format: uri
        openapi_url:
          type: string
          format: uri
        student_accounts:
          type: boolean
          enum:
            - false
        student_names:
          type: boolean
          enum:
            - false
        instructions:
          type: string
    ReteachFailure:
      type: object
      properties:
        ok:
          type: boolean
          enum:
            - false
        error:
          type: string
    ReteachDescribe:
      type: object
      properties:
        ok:
          type: boolean
        openapi_url:
          type: string
        usage:
          type: string
        timer_seconds:
          type: integer
        student_accounts:
          type: boolean
        student_names:
          type: boolean
`;
}
