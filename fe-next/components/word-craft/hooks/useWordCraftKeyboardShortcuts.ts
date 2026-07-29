'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  turn: string;
  pendingPlacements: readonly any[];
  burnout: boolean;
  playerRack: readonly any[];
  dict: Set<string> | null;
  axis: 'h' | 'v' | null;
  boardSize: number;
  onRecallAll(): void;
  onSubmit(): void;
  onRecallOne(tileId: string): void;
  onFastTap(tile: { id: string }): void;
  onSelectTile(tileId: string): void;
  onPlaceOnBoard(row: number, col: number): void;
}

export function useWordCraftKeyboardShortcuts(props: Props) {
  const [reticle, setReticle] = useState<{ row: number; col: number } | null>(null);
  const pendingIdsSetRef = useRef<Set<string>>(new Set());

  // Update pending IDs ref whenever pending placements change
  useEffect(() => {
    pendingIdsSetRef.current = new Set(props.pendingPlacements.map((p: any) => p.rackTileId));
  }, [props.pendingPlacements]);

  // Desktop keyboard shortcuts
  useEffect(() => {
    if (props.turn !== 'player') return;
    const onKey = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (ev.key === 'Escape') {
        if (props.pendingPlacements.length > 0) {
          ev.preventDefault();
          props.onRecallAll();
        }
        return;
      }
      if (ev.key === 'Enter') {
        if (props.pendingPlacements.length > 0 && props.dict && !props.burnout) {
          ev.preventDefault();
          props.onSubmit();
        }
        return;
      }
      if (ev.key === 'Backspace') {
        if (props.pendingPlacements.length > 0) {
          ev.preventDefault();
          const last = props.pendingPlacements[props.pendingPlacements.length - 1];
          props.onRecallOne(last.rackTileId);
        }
        return;
      }
      // Letter shortcut
      if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey && ev.key !== ' ') {
        const upper = ev.key.toUpperCase();
        const candidate = props.playerRack.find(
          (t: any) => !pendingIdsSetRef.current.has(t.id) && t.letter.toUpperCase() === upper,
        );
        if (!candidate) return;
        ev.preventDefault();
        if (props.axis !== null) {
          props.onFastTap({ id: candidate.id });
        } else {
          props.onSelectTile(candidate.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.turn, props.pendingPlacements, props.burnout, props.playerRack, props.dict, props.axis, props.onRecallAll, props.onSubmit, props.onRecallOne, props.onFastTap, props.onSelectTile]);

  // Arrow-key reticle
  useEffect(() => {
    if (props.turn !== 'player') return;
    const onKey = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      const isArrow = ev.key === 'ArrowUp' || ev.key === 'ArrowDown' || ev.key === 'ArrowLeft' || ev.key === 'ArrowRight';
      if (!isArrow && ev.key !== ' ') return;

      const size = props.boardSize;
      const wrap = (n: number) => (n + size) % size;

      if (isArrow) {
        ev.preventDefault();
        setReticle((prev) => {
          if (!prev) {
            const center = Math.floor(size / 2);
            return { row: center, col: center };
          }
          if (ev.key === 'ArrowUp') return { row: wrap(prev.row - 1), col: prev.col };
          if (ev.key === 'ArrowDown') return { row: wrap(prev.row + 1), col: prev.col };
          if (ev.key === 'ArrowLeft') return { row: prev.row, col: wrap(prev.col - 1) };
          if (ev.key === 'ArrowRight') return { row: prev.row, col: wrap(prev.col + 1) };
          return prev;
        });
        return;
      }

      // Space
      if (ev.key === ' ' && reticle) {
        ev.preventDefault();
        props.onPlaceOnBoard(reticle.row, reticle.col);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.turn, props.boardSize, reticle, props.onPlaceOnBoard]);

  // Drop reticle when turn ends
  useEffect(() => {
    if (props.turn !== 'player') setReticle(null);
  }, [props.turn]);

  return { reticle };
}
