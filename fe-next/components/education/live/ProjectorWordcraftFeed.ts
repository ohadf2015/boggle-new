'use client';

import { useEffect, useReducer } from 'react';
import { getTileBag, type SupportedLocale } from '@/lib/word-craft/tileBag';
import {
  WORDCRAFT_LIVE_EVENTS,
  type WordcraftLiveActivity,
  type WordcraftLiveInit,
  type WordcraftLiveProjectorState,
} from '@/shared/types/wordcraftLive';
import type { WordcraftLiveSocket } from '@/components/multiplayer/wordcraft/useWordcraftLive';

export interface FeedTarget {
  word: string;
  built: boolean;
  by: string | null;
}

export interface FeedPlay extends WordcraftLiveActivity {
  key: number;
}

export interface WordcraftFeed {
  targets: FeedTarget[];
  plays: FeedPlay[];
  seq: number;
}

type FeedEvent =
  | { type: 'init'; targets: string[] }
  | { type: 'projectorState'; targets: { word: string; built: boolean }[] }
  | { type: 'activity'; activity: WordcraftLiveActivity };

const MAX_PLAYS = 6;

export const EMPTY_WORDCRAFT_FEED: WordcraftFeed = { targets: [], plays: [], seq: 0 };

export function reduceWordcraftFeed(state: WordcraftFeed, event: FeedEvent): WordcraftFeed {
  switch (event.type) {
    case 'init':
      return { ...state, targets: event.targets.map((word) => ({ word, built: false, by: null })) };
    case 'projectorState': {
      const known = new Map(state.targets.map((x) => [x.word, x.by]));
      return { ...state, targets: event.targets.map((x) => ({ word: x.word, built: x.built, by: known.get(x.word) ?? null })) };
    }
    case 'activity': {
      const seq = state.seq + 1;
      const a = event.activity;
      const targets = a.lessonWord
        ? state.targets.map((x) => (x.word === a.lessonWord && !x.built ? { ...x, built: true, by: a.username } : x))
        : state.targets;
      return { targets, seq, plays: [{ ...a, key: seq }, ...state.plays].slice(0, MAX_PLAYS) };
    }
  }
}

const HEBREW_FINAL: Record<string, string> = { 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' };
const HEBREW_BASE: Record<string, string> = Object.fromEntries(Object.entries(HEBREW_FINAL).map(([base, final]) => [final, base]));

export function wordTiles(word: string, language: string): { letter: string; value: number }[] {
  const values = getTileBag(language as SupportedLocale).values;
  const letters = Array.from(word.toUpperCase()).map((ch) => (language === 'he' ? (HEBREW_BASE[ch] ?? ch) : ch));
  return letters.map((letter, i) => ({
    letter: language === 'he' && i === letters.length - 1 ? (HEBREW_FINAL[letter] ?? letter) : letter,
    value: values[letter] ?? values[letter.toLowerCase()] ?? 0,
  }));
}

/** The host is a spectator: it pulls the checklist on mount and never requests a personal board. */
export function useWordcraftFeed(socket: WordcraftLiveSocket | null): WordcraftFeed {
  const [feed, dispatch] = useReducer(reduceWordcraftFeed, EMPTY_WORDCRAFT_FEED);
  useEffect(() => {
    if (!socket) return;
    const onInit = (p: unknown) => dispatch({ type: 'init', targets: (p as WordcraftLiveInit).targets });
    const onState = (p: unknown) => dispatch({ type: 'projectorState', targets: (p as WordcraftLiveProjectorState).targets });
    const onActivity = (p: unknown) => dispatch({ type: 'activity', activity: p as WordcraftLiveActivity });
    socket.on(WORDCRAFT_LIVE_EVENTS.init, onInit);
    socket.on(WORDCRAFT_LIVE_EVENTS.projectorState, onState);
    socket.on(WORDCRAFT_LIVE_EVENTS.activity, onActivity);
    socket.emit(WORDCRAFT_LIVE_EVENTS.projectorState);
    return () => {
      socket.off(WORDCRAFT_LIVE_EVENTS.init, onInit);
      socket.off(WORDCRAFT_LIVE_EVENTS.projectorState, onState);
      socket.off(WORDCRAFT_LIVE_EVENTS.activity, onActivity);
    };
  }, [socket]);
  return feed;
}
