'use client';

/**
 * useWordcraftLive — the student's live-race brain.
 *
 * Server-authoritative: the board, rack, scores and the Baron's replies all
 * arrive as snapshots. This hook owns ONLY the placement UX (staged tiles,
 * anchor cell, direction) and translates it into the placement payload the
 * server re-validates from scratch. Socket is injected (structural type) so
 * the whole machine is testable without a connection.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlacedTile, RackTile } from '@/lib/word-craft/types';
import {
  WORDCRAFT_LIVE_EVENTS,
  type WordcraftLiveActivity,
  type WordcraftLivePlaceResult,
  type WordcraftLiveSnapshot,
} from '@/shared/types/wordcraftLive';

export interface WordcraftLiveSocket {
  emit(event: string, payload?: unknown): void;
  on(event: string, fn: (payload: unknown) => void): void;
  off(event: string, fn: (payload: unknown) => void): void;
}

export type WordcraftDirection = 'across' | 'down';

export interface WordcraftLiveState {
  snapshot: WordcraftLiveSnapshot | null;
  stagedIds: string[];
  anchor: { row: number; col: number } | null;
  direction: WordcraftDirection;
  lastError: string | null;
  activity: WordcraftLiveActivity[];
}

/** Placement preview for the current stage + anchor, or null when incomplete. */
export function buildPlacements(
  staged: RackTile[],
  anchor: { row: number; col: number } | null,
  direction: WordcraftDirection,
): PlacedTile[] | null {
  if (!anchor || staged.length === 0) return null;
  return staged.map((tile, i) => ({
    row: direction === 'across' ? anchor.row : anchor.row + i,
    col: direction === 'across' ? anchor.col + i : anchor.col,
    letter: tile.letter,
    value: tile.value,
    isBlank: tile.isBlank,
    rackTileId: tile.id,
  }));
}

/** Every staged tile lands on an in-bounds, unoccupied cell. */
export function placementsFit(
  placements: PlacedTile[] | null,
  snapshot: WordcraftLiveSnapshot | null,
): boolean {
  if (!placements || !snapshot) return false;
  const occupied = new Set(snapshot.cells.map((c) => `${c.row},${c.col}`));
  return placements.every(
    (p) =>
      p.row >= 0 && p.row < snapshot.boardSize &&
      p.col >= 0 && p.col < snapshot.boardSize &&
      !occupied.has(`${p.row},${p.col}`),
  );
}

const MAX_ACTIVITY = 12;

export function useWordcraftLive(opts: { socket: WordcraftLiveSocket | null }) {
  const { socket } = opts;
  const [snapshot, setSnapshot] = useState<WordcraftLiveSnapshot | null>(null);
  const [stagedIds, setStagedIds] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<{ row: number; col: number } | null>(null);
  const [direction, setDirection] = useState<WordcraftDirection>('across');
  const [lastError, setLastError] = useState<string | null>(null);
  const [activity, setActivity] = useState<WordcraftLiveActivity[]>([]);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  useEffect(() => {
    if (!socket) return;

    const onState = (p: unknown) => {
      setSnapshot(p as WordcraftLiveSnapshot);
    };
    const onInit = () => {
      // Mounted before the race existed (countdown race) — pull now.
      socket.emit(WORDCRAFT_LIVE_EVENTS.requestState);
    };
    const onPlaceResult = (p: unknown) => {
      const r = p as WordcraftLivePlaceResult;
      if (r.accepted) {
        setStagedIds([]);
        setAnchor(null);
        setLastError(null);
      } else {
        // Tiles stay staged so the student adjusts instead of re-tapping.
        setLastError(r.error ?? 'INVALID_WORD');
      }
    };
    const onActivity = (p: unknown) => {
      setActivity((prev) => [p as WordcraftLiveActivity, ...prev].slice(0, MAX_ACTIVITY));
    };

    socket.on(WORDCRAFT_LIVE_EVENTS.state, onState);
    socket.on(WORDCRAFT_LIVE_EVENTS.init, onInit);
    socket.on(WORDCRAFT_LIVE_EVENTS.placeResult, onPlaceResult);
    socket.on(WORDCRAFT_LIVE_EVENTS.activity, onActivity);
    // First paint and reconnect take ONE path: ask for the personal board.
    socket.emit(WORDCRAFT_LIVE_EVENTS.requestState);

    return () => {
      socket.off(WORDCRAFT_LIVE_EVENTS.state, onState);
      socket.off(WORDCRAFT_LIVE_EVENTS.init, onInit);
      socket.off(WORDCRAFT_LIVE_EVENTS.placeResult, onPlaceResult);
      socket.off(WORDCRAFT_LIVE_EVENTS.activity, onActivity);
    };
  }, [socket]);

  const rackById = useMemo(() => {
    const map = new Map<string, RackTile>();
    for (const t of snapshot?.rack ?? []) map.set(t.id, t);
    return map;
  }, [snapshot]);

  const staged = useMemo(
    () => stagedIds.map((id) => rackById.get(id)).filter((t): t is RackTile => !!t),
    [stagedIds, rackById],
  );

  const stagedWord = staged.map((t) => t.letter).join('');

  const tapRackTile = useCallback((id: string) => {
    setLastError(null);
    setStagedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const recallTile = useCallback((id: string) => {
    setStagedIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const clearStage = useCallback(() => {
    setStagedIds([]);
    setAnchor(null);
  }, []);

  const setAnchorCell = useCallback((row: number, col: number) => {
    setLastError(null);
    setAnchor({ row, col });
  }, []);

  const toggleDirection = useCallback(() => {
    setDirection((d) => (d === 'across' ? 'down' : 'across'));
  }, []);

  const placements = useMemo(
    () => buildPlacements(staged, anchor, direction),
    [staged, anchor, direction],
  );
  const canSubmit = placementsFit(placements, snapshot);

  const submit = useCallback(() => {
    if (!socket || !placements || !placementsFit(placements, snapshotRef.current)) return;
    socket.emit(WORDCRAFT_LIVE_EVENTS.place, { placements });
  }, [socket, placements]);

  return {
    snapshot,
    stagedIds,
    stagedWord,
    anchor,
    direction,
    lastError,
    activity,
    placements,
    canSubmit,
    tapRackTile,
    recallTile,
    clearStage,
    setAnchor: setAnchorCell,
    toggleDirection,
    submit,
  };
}
