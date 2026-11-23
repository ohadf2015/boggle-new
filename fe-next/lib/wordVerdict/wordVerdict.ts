export const WORD_VERDICT_REASONS = [
  'too-short', 'too-long', 'no-center', 'bad-letters', 'not-on-board', 'not-a-word', 'already-found', 'cant-check', 'inappropriate',
] as const;
export type WordVerdictReason = typeof WORD_VERDICT_REASONS[number];

export type VerdictParams = { min?: number | string; max?: number | string; letter?: string; penalty?: number };
export type VerdictTone = 'error' | 'soft' | 'warn';

export interface WordVerdict {
  reason: WordVerdictReason;
  key: string;
  params: VerdictParams;
  tone: VerdictTone;
  sound: boolean;
  haptic: 'error' | null;
  durationMs: number;
  repeat: boolean;
}

export const VERDICT_MS = 1600;
export const VERDICT_REPEAT_MS = 2600;

const KEY: Record<WordVerdictReason, string> = {
  'too-short': 'wordVerdict.tooShort',
  'too-long': 'wordVerdict.tooLong',
  'no-center': 'wordVerdict.missingCenter',
  'bad-letters': 'wordVerdict.badLetters',
  'not-on-board': 'wordVerdict.notOnBoard',
  'not-a-word': 'wordVerdict.notAWord',
  'already-found': 'wordVerdict.alreadyFound',
  'cant-check': 'wordVerdict.cantCheck',
  inappropriate: 'wordVerdict.inappropriate',
};

const AGAIN_KEY: Partial<Record<WordVerdictReason, string>> = {
  'not-a-word': 'wordVerdict.notAWordAgain',
  'not-on-board': 'wordVerdict.notOnBoardAgain',
};

const CODE_REASON: Record<string, WordVerdictReason> = {
  not_in_dictionary: 'not-a-word',
  invalid_shape: 'not-a-word',
  not_on_board: 'not-on-board',
  too_short: 'too-short',
  duplicate: 'already-found',
  error: 'cant-check',
};

/** Server codes that are not about the word itself; never shown as a word verdict. */
export type ServerNotice = 'slow-down' | 'paused' | 'frozen';
const CODE_NOTICE: Record<string, ServerNotice> = { rate_limited: 'slow-down', paused: 'paused', frozen: 'frozen', boss_frozen: 'frozen' };

export function noticeFromCode(code: string | undefined | null): ServerNotice | null {
  return code ? CODE_NOTICE[code] ?? null : null;
}

const TONE: Record<WordVerdictReason, VerdictTone> = {
  'too-short': 'error', 'too-long': 'error', 'no-center': 'error', 'bad-letters': 'error',
  'not-on-board': 'error', 'not-a-word': 'error', 'already-found': 'soft', 'cant-check': 'warn', inappropriate: 'error',
};

/** Reasons a second identical miss can escalate; a failed check or a blocked word never does. */
export function canEscalate(reason: WordVerdictReason): boolean {
  return reason !== 'cant-check' && reason !== 'inappropriate';
}

const PARAM: Partial<Record<WordVerdictReason, keyof VerdictParams>> = { 'too-short': 'min', 'too-long': 'max', 'no-center': 'letter' };

export function wordVerdict(reason: WordVerdictReason, params: VerdictParams = {}, repeat = false): WordVerdict {
  const tone = TONE[reason];
  return {
    reason,
    key: (repeat && AGAIN_KEY[reason]) || KEY[reason],
    params: { ...(PARAM[reason] ? { [PARAM[reason]!]: params[PARAM[reason]!] } : {}), ...(params.penalty ? { penalty: params.penalty } : {}) },
    tone,
    sound: tone !== 'warn',
    haptic: tone === 'warn' ? null : 'error',
    durationMs: repeat ? VERDICT_REPEAT_MS : VERDICT_MS,
    repeat,
  };
}

type Translate = (key: string, params?: Record<string, string | number>) => string | undefined;

export function verdictMessage(t: Translate, verdict: Pick<WordVerdict, 'key' | 'params'>): string {
  const { penalty, ...rest } = verdict.params;
  const params = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)) as Record<string, string | number>;
  const reason = (Object.keys(params).length ? t(verdict.key, params) : t(verdict.key)) ?? verdict.key;
  return penalty ? t('wordVerdict.withPenalty', { reason, n: penalty }) ?? reason : reason;
}

/** Server and mode codes (snake or kebab) onto a reason; null for codes that are not word verdicts. */
export function reasonFromCode(code: string | undefined | null): WordVerdictReason | null {
  if (!code) return null;
  if ((WORD_VERDICT_REASONS as readonly string[]).includes(code)) return code as WordVerdictReason;
  return CODE_REASON[code] ?? null;
}

export function verdictKey(reason: WordVerdictReason): string {
  return KEY[reason];
}
