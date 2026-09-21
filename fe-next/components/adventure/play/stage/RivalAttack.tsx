'use client';

/**
 * The ordinary fight's rival, fighting back where you can SEE it.
 *
 * Elite and boss stages mount AttackFlight inside CombatStage; an ordinary
 * node draws FoeTarget instead, so its rival's swing used to be a line of
 * text in the run bar. This gives it the same watched event — the shot leaves
 * the rival's portrait, lands on your hearts, the HIT banner stamps — plus the
 * sound cues and a red edge on the screen when a heart goes. Portalled and
 * pointer-events:none: nothing here takes layout or blocks the board.
 */
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { CombatState } from '@/lib/adventure/play/combat';
import type { CombatFxEntry } from '../useAdventureRun';
import AttackFlight from './AttackFlight';
import { useCombatJuice } from './useCombatJuice';

export default function RivalAttack({ combat, feed }: { combat: CombatState; feed: readonly CombatFxEntry[] }) {
  const juice = useCombatJuice(feed);
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <>
      <AttackFlight combat={combat} status={juice.status} />
      {mounted && createPortal(
        <div className="pointer-events-none fixed inset-0 z-[57]" aria-hidden>
          <AnimatePresence>
            {juice.hurtPulse > 0 && (
              <motion.div key={`hurt-${juice.hurtPulse}`} className="absolute inset-0"
                style={{ boxShadow: 'inset 0 0 70px 14px rgba(255,20,60,0.9)' }}
                initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: reduce ? 0.2 : 0.7, ease: 'easeOut' }} />
            )}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </>
  );
}
