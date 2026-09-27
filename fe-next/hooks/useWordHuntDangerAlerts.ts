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
  useWordHuntMyLife,
} from '@/hooks/gameState/store';
import type { DangerToast } from '@/components/wordhunt/WordHuntDangerToast';

const DANGER_THRESHOLD = 30;

let nextId = 1;
function genId(): string {
  return `danger-${nextId++}`;
}

/**
 * @param currentUsername - the local player's name. When provided, their own
 *   low-life crossing surfaces as a tailored `lowLifeSelf` encouragement toast
 *   ("find words to heal") instead of the generic opponent `danger` toast, so
 *   the player gets exactly one, action-oriented nudge.
 */
export function useWordHuntDangerAlerts(currentUsername?: string) {
  const playerLives = useWordHuntPlayerLives();
  const eliminatedPlayers = useWordHuntEliminatedPlayers();
  const myLife = useWordHuntMyLife();

  const [toasts, setToasts] = useState<DangerToast[]>([]);
  const dangerTriggered = useRef<Set<string>>(new Set());
  const eliminatedTriggered = useRef<Set<string>>(new Set());
  const lastStandingTriggered = useRef(false);
  const lowLifeSelfTriggered = useRef(false);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Detect danger + eliminated + lastStanding
  // Batch all new toasts from a single effect pass into one setState call.
  useEffect(() => {
    const players = Object.keys(playerLives);
    const batch: DangerToast[] = [];

    // Self low-life: encourage the local player to find words to heal. Fire once
    // per descent into the danger zone; re-arm only after they heal back above
    // it (so a heal→drop loop nudges again, but a steady drain to 0 does not spam,
    // and death itself stays silent — that's the eliminated toast's job). Runs
    // independent of opponent state so it still fires if playerLives is empty.
    if (myLife > 0 && myLife < DANGER_THRESHOLD) {
      if (!lowLifeSelfTriggered.current) {
        lowLifeSelfTriggered.current = true;
        batch.push({ id: genId(), type: 'lowLifeSelf', timestamp: Date.now() });
      }
    } else if (myLife >= DANGER_THRESHOLD) {
      lowLifeSelfTriggered.current = false;
    }

    if (players.length > 0) {
      // Check danger (<30 HP) — opponents only; the local player gets lowLifeSelf above.
      for (const player of players) {
        if (currentUsername && player === currentUsername) continue;
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
    }

    if (batch.length > 0) {
      setToasts(prev => [...prev, ...batch]);
    }
  }, [playerLives, eliminatedPlayers, myLife, currentUsername]);

  return { toasts, dismissToast };
}
