/**
 * Shiritori single-player pure engine — turn loop without any IO. The page
 * component owns timers, animation, and the player-word dictionary check;
 * this module owns the rule transitions (chain ok? ends in ん? used?).
 *
 * Mirrors backend rules in `shared/utils/shiritori.ts` so SP and MP behave
 * identically. Bot picks come from `pickShiritoriWord` against the curated
 * client pool.
 */
import { chains, endsInN, shiritoriTail } from '@/shared/utils/shiritori';

export type Turn = 'player' | 'bot';
export type Phase = 'playing' | 'won' | 'lost';

export interface SpState {
  chain: string[];           // ordered words played so far
  used: Set<string>;         // dedupe set (same words)
  turn: Turn;
  phase: Phase;
  /** Why the round ended — for the result card / sound choice. */
  endReason?: 'player-no-move' | 'player-ends-n' | 'player-invalid' | 'bot-no-move' | 'bot-ends-n';
}

export function initialSpState(seed: string): SpState {
  return {
    chain: [seed],
    used: new Set([seed]),
    turn: 'player',
    phase: 'playing',
  };
}

/** Required head for the next word (tail of the last chain word). */
export function requiredHead(s: SpState): string {
  if (s.chain.length === 0) return '';
  return shiritoriTail(s.chain[s.chain.length - 1]);
}

export interface PlayerCommitOk { kind: 'ok'; state: SpState }
export interface PlayerCommitErr { kind: 'err'; reason: 'not-hiragana' | 'wrong-head' | 'duplicate' | 'not-in-dict' }
export type PlayerCommit = PlayerCommitOk | PlayerCommitErr;

const HIRAGANA_RE = /^[ぁ-んー]+$/;

/**
 * Commit a player-submitted word. Caller has already validated it against the
 * dictionary endpoint (dictOk=true) so this is the post-validation gate.
 */
export function commitPlayerWord(s: SpState, word: string, dictOk: boolean, wildcardHead = false): PlayerCommit {
  if (!HIRAGANA_RE.test(word)) return { kind: 'err', reason: 'not-hiragana' };
  if (s.used.has(word)) return { kind: 'err', reason: 'duplicate' };
  if (!wildcardHead && s.chain.length > 0 && !chains(s.chain[s.chain.length - 1], word)) {
    return { kind: 'err', reason: 'wrong-head' };
  }
  if (!dictOk) return { kind: 'err', reason: 'not-in-dict' };

  const used = new Set(s.used);
  used.add(word);
  const chain = [...s.chain, word];
  if (endsInN(word)) {
    return { kind: 'ok', state: { ...s, chain, used, phase: 'lost', endReason: 'player-ends-n' } };
  }
  return { kind: 'ok', state: { ...s, chain, used, turn: 'bot' } };
}

/** Apply a bot pick (null = bot has no move and loses). */
export function commitBotWord(s: SpState, word: string | null): SpState {
  if (word === null) {
    return { ...s, phase: 'won', endReason: 'bot-no-move' };
  }
  const used = new Set(s.used);
  used.add(word);
  const chain = [...s.chain, word];
  if (endsInN(word)) {
    return { ...s, chain, used, phase: 'won', endReason: 'bot-ends-n' };
  }
  return { ...s, chain, used, turn: 'player' };
}

/** Resignation / no-move from the player. */
export function playerGivesUp(s: SpState): SpState {
  return { ...s, phase: 'lost', endReason: 'player-no-move' };
}
