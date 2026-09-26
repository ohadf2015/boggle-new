'use client';

/**
 * The in-round fun layer, driven ONLY by real events:
 * - accepted word (server `wordAccepted` via mpFeedback) → score bump + "+N"
 *   floater with the SERVER points; combo ≥3 → loud "On fire" + combo sound
 * - rejection → a QUIET callout (small, low contrast); found-by-other → cyan
 * - rank diffs → "{name} passed you!" (quiet pink) / "You passed {name}!"
 *   (loud lime) + rank-chip flip; lead change → banner + sound
 * - last 5s → one heartbeat per second; 0 → TIME! slam
 *
 * Two lanes, never a stack (MpCallouts): newest callout wins; banners queue.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useMpLastReject } from '@/hooks/useMpFeedback';
import { detectOvertakes, detectPasses, type RankedPlayer } from '@/lib/multiplayer/overtakeDetection';
import type { MpRejectReason } from '@/lib/multiplayer/mpFeedback';
import type { MpBanner, MpCallout, MpScoreGain } from '../shell';
import { useFreshLastWord, useServerFloaters, type RoundFloater } from './useServerFloaters';

export { MAX_FLOATERS, FLOATER_MS, type RoundFloater } from './useServerFloaters';

/** Combo level from which an accept is "on fire". */
export const ON_FIRE_LEVEL = 3;
/** Heartbeat from this many seconds left. */
export const HEARTBEAT_FROM_SEC = 5;

const REJECT_KEY: Record<Exclude<MpRejectReason, 'found-by-other'>, string> = {
  invalid: 'mpUi.round.reject.invalid',
  'too-short': 'mpUi.round.reject.tooShort',
  'not-on-board': 'mpUi.round.reject.notOnBoard',
  'already-found': 'mpUi.round.reject.alreadyFound',
};

/**
 * First-strong isolate: a player name dropped into a translated line keeps its
 * own direction (a Hebrew name in "You passed {name}!" — or a Latin one in the
 * Hebrew line — never reorders the text around it).
 */
export const isolateName = (name: string): string => `\u2068${name}\u2069`;

/** Longest name a loud one-line callout carries on a phone; longer ones are clipped with "…". */
export const CALLOUT_NAME_MAX = 10;

/** A clipped, bidi-isolated name for a callout line (code points, so an emoji is never split). */
export const calloutName = (name: string): string => {
  const chars = Array.from(name);
  return isolateName(chars.length > CALLOUT_NAME_MAX ? `${chars.slice(0, CALLOUT_NAME_MAX - 1).join('')}\u2026` : name);
};

export interface RoundJuice {
  gain: MpScoreGain | null;
  floaters: RoundFloater[];
  callout: MpCallout | null;
  banners: MpBanner[];
  dropBanner: () => void;
  rankFlipKey: string | undefined;
  timeUp: boolean;
  /** Screen-reader-only reason for the last plain rejection (the pill shows it visually). */
  rejectText: string | null;
}

/** The two socket calls the round juice needs. */
export type RoundSocket = Pick<Socket, 'on' | 'off'>;

interface SpecialWordFound {
  word?: string;
  /** The server's key (backend wordValidationHandler). */
  foundBy?: string;
  bonus?: number;
}

interface Params {
  meId: string;
  /** Best-first standings (server scores). */
  standings: readonly RankedPlayer[];
  remainingTime: number | null | undefined;
  /** Live room socket: server-only moments (special word) that mpFeedback does not carry. */
  socket?: RoundSocket | null;
}

export function useRoundJuice({ meId, standings, remainingTime, socket }: Params): RoundJuice {
  const { t } = useLanguage();
  const { playComboSound, playLeadChangeSound, playTimerHeartbeatSound } = useSoundEffects();
  const freshWord = useFreshLastWord();
  const floaters = useServerFloaters(freshWord);
  const lastReject = useMpLastReject();
  // Events recorded before this round mounted belong to a previous round.
  const [mountedAt] = useState(() => Date.now());

  const [callout, setCallout] = useState<MpCallout | null>(null);
  const [banners, setBanners] = useState<MpBanner[]>([]);
  const [rankFlipKey, setRankFlipKey] = useState<string | undefined>(undefined);
  const [timeUp, setTimeUp] = useState(false);
  const [rejectText, setRejectText] = useState<string | null>(null);
  const seq = useRef(0);
  const nextId = (p: string) => `${p}-${++seq.current}`;

  const gain = useMemo<MpScoreGain | null>(
    () => (freshWord ? { id: freshWord.id, points: freshWord.points } : null),
    [freshWord],
  );

  // Accepted word → combo callout (floaters: useServerFloaters; ladder points: useServerAcceptedWords).
  useEffect(() => {
    if (!freshWord) return;
    if (freshWord.comboLevel >= ON_FIRE_LEVEL) {
      setCallout({ id: nextId('fire'), text: t('mpUi.round.onFire', { level: freshWord.comboLevel }), tone: 'loud', color: 'lime' });
      playComboSound(freshWord.comboLevel);
    }
    // Keyed on the event id only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshWord?.id]);
  // Rejections: quiet; found-by-other: quiet cyan with the partial credit.
  useEffect(() => {
    if (!lastReject || lastReject.ts < mountedAt) return;
    if (lastReject.reason === 'found-by-other') {
      setCallout({
        id: lastReject.id,
        text: t('mpUi.round.gotItFirst', { name: calloutName(lastReject.foundBy ?? '?'), points: lastReject.points ?? 0 }),
        tone: 'quiet',
        color: 'cyan',
      });
      return;
    }
    // Plain rejections stay QUIET: the word pill already shakes red with the
    // reason, so no callout — just a screen-reader announcement.
    setRejectText(t(REJECT_KEY[lastReject.reason]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastReject?.id]);

  // Rank diffs between consecutive standings snapshots.
  const prevStandings = useRef<readonly RankedPlayer[]>(standings);
  useEffect(() => {
    const prev = prevStandings.current;
    prevStandings.current = standings;
    if (prev === standings || prev.length === 0) return;
    const next = standings as RankedPlayer[];
    const { overtakenBy } = detectOvertakes(prev as RankedPlayer[], next, meId);
    const { passed } = detectPasses(prev as RankedPlayer[], next, meId);
    const prevRank = prev.findIndex((p) => p.username === meId) + 1;
    const rank = next.findIndex((p) => p.username === meId) + 1;
    if (rank > 0 && prevRank > 0 && rank !== prevRank) setRankFlipKey(`r${rank}-${++seq.current}`);
    if (passed.length > 0) {
      setCallout({ id: nextId('pass'), text: t('mpUi.round.youPassed', { name: calloutName(passed[0]) }), tone: 'loud', color: 'lime' });
    } else if (overtakenBy.length > 0) {
      setCallout({ id: nextId('over'), text: t('mpUi.round.passedYou', { name: calloutName(overtakenBy[0]) }), tone: 'quiet', color: 'pink' });
    }
    // Lead change: the leader's name changed and at least one of them is me.
    const prevLead = prev[0]?.username;
    const lead = next[0]?.username;
    if (prevLead && lead && prevLead !== lead && (next[0].score ?? 0) > 0 && (lead === meId || prevLead === meId)) {
      const mine = lead === meId;
      setBanners((b) => [...b, { id: nextId('lead'), text: mine ? t('mpUi.round.tookLead') : t('mpUi.round.lostLead', { name: calloutName(lead) }), color: mine ? 'lime' : 'pink' }]);
      playLeadChangeSound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standings, meId]);

  // Special word: a banner (never a card over the board), finder from the
  // server's `foundBy`, points = the server's bonus.
  useEffect(() => {
    if (!socket) return undefined;
    const onSpecial = (data: SpecialWordFound) => {
      if (!data?.word) return;
      const finder = data.foundBy ?? '';
      const mine = finder === meId;
      const params = { word: data.word.toUpperCase(), name: calloutName(finder), bonus: data.bonus ?? 0 };
      setBanners((b) => [...b, { id: nextId('special'), text: t(mine ? 'mpUi.round.specialWordMine' : 'mpUi.round.specialWord', params), color: mine ? 'lime' : 'purple' }]);
    };
    socket.on('specialWordFound', onSpecial);
    return () => {
      socket.off('specialWordFound', onSpecial);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, meId]);

  // Timer: heartbeat per whole second in the last 5s; TIME! slam at 0.
  const whole = remainingTime == null ? null : Math.max(0, Math.ceil(remainingTime));
  const prevWhole = useRef<number | null>(whole);
  useEffect(() => {
    const prev = prevWhole.current;
    prevWhole.current = whole;
    if (whole == null || prev == null || whole === prev) return;
    if (whole > 0 && whole <= HEARTBEAT_FROM_SEC) playTimerHeartbeatSound();
    if (whole === 0 && prev > 0) setTimeUp(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whole]);

  const dropBanner = useCallback(() => setBanners((b) => b.slice(1)), []);

  return { gain, floaters, callout, banners, dropBanner, rankFlipKey, timeUp, rejectText };
}
