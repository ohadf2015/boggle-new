'use client';

import { useEffect, useRef, useState } from 'react';
import type { ClassroomBossView } from '@/shared/types/classroomBoss';
import { useClassroomBossStore } from '@/stores/classroomBossStore';

export type BossCue =
  | { kind: 'phase'; phase: number; id: number }
  | { kind: 'staggered'; id: number }
  | { kind: 'attack'; attack: 'freeze' | 'blur' | 'drain'; blocked: boolean; healed: number; id: number };

const CUE_MS = 2200;

export function useBossCues(view: ClassroomBossView | null): BossCue | null {
  const attack = useClassroomBossStore((s) => s.attack);
  const [cue, setCue] = useState<BossCue | null>(null);
  const prev = useRef<{ phase: number; staggers: number; attackId: number } | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!view) {
      prev.current = null;
      return;
    }
    const p = prev.current;
    prev.current = { phase: view.phase, staggers: view.staggers, attackId: attack?.id ?? 0 };
    if (!p) return;
    if (view.phase > p.phase) setCue({ kind: 'phase', phase: view.phase, id: ++seq.current });
    else if (view.staggers > p.staggers) setCue({ kind: 'staggered', id: ++seq.current });
    else if (attack && attack.id !== p.attackId) {
      setCue({ kind: 'attack', attack: attack.kind, blocked: attack.blocked, healed: attack.healed, id: ++seq.current });
    }
  }, [view, attack]);

  useEffect(() => {
    if (!cue) return undefined;
    const id = window.setTimeout(() => setCue((c) => (c?.id === cue.id ? null : c)), CUE_MS);
    return () => window.clearTimeout(id);
  }, [cue]);

  return cue;
}
