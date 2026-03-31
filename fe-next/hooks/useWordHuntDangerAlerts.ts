/**
 * useWordHuntDangerAlerts — monitors Word Hunt MP player lives
 * and produces danger/eliminated/lastStanding toast events.
 *
 * Tracks which players already triggered a danger alert to avoid duplicates.
 * Batches toasts per effect cycle to avoid missed events.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  useWordHuntPlayerLives,
  useWordHuntEliminatedPlayers,
} from '@/hooks/gameState/store';
import type { DangerToast } from '@/components/wordhunt/WordHuntDangerToast';

const DANGER_THRESHOLD = 30;

let nextId = 1;
function genId(): string {
  return `danger-${nextId++}`;
}

export function useWordHuntDangerAlerts() {
  const playerLives = useWordHuntPlayerLives();
  const eliminatedPlayers = useWordHuntEliminatedPlayers();

  const [toasts, setToasts] = useState<DangerToast[]>([]);
  const dangerTriggered = useRef<Set<string>>(new Set());
  const eliminatedTriggered = useRef<Set<string>>(new Set());
  const lastStandingTriggered = useRef(false);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Detect danger + eliminated + lastStanding
  // Batch all new toasts from a single effect pass into one setState call.
  useEffect(() => {
    const players = Object.keys(playerLives);
    if (players.length === 0) return;

    const batch: DangerToast[] = [];

    // Check danger (<30 HP)
    for (const player of players) {
      const hp = playerLives[player];
      if (hp > 0 && hp < DANGER_THRESHOLD && !dangerTriggered.current.has(player)) {
        dangerTriggered.current.add(player);
        batch.push({ id: genId(), type: 'danger', playerName: player, timestamp: Date.now() });
      }
    }

    // Check eliminated
    for (const player of eliminatedPlayers) {
      if (!eliminatedTriggered.current.has(player)) {
        eliminatedTriggered.current.add(player);
        batch.push({ id: genId(), type: 'eliminated', playerName: player, timestamp: Date.now() });
      }
    }

    // Check last standing (exactly 2 alive)
    const aliveCount = players.filter(p => !eliminatedPlayers.includes(p)).length;
    if (aliveCount === 2 && !lastStandingTriggered.current && eliminatedPlayers.length > 0) {
      lastStandingTriggered.current = true;
      batch.push({ id: genId(), type: 'lastStanding', count: 2, timestamp: Date.now() });
    }

    if (batch.length > 0) {
      setToasts(prev => [...prev, ...batch]);
    }
  }, [playerLives, eliminatedPlayers]);

  return { toasts, dismissToast };
}
