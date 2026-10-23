'use client';

import { useEffect, useRef, useState } from 'react';
import { resolveJoinTarget, type JoinTarget } from './joinTarget';
import { JOIN_CODE_LENGTH } from './JoinCodeField';

export interface JoinTargetLookup {
  /** Resolved class/teacher behind the code, or null while unknown. */
  target: JoinTarget | null;
  /** The code `target` describes; a verdict about another code must not act. */
  targetCode: string;
  isChecking: boolean;
}

/** The code lookup. It decorates the flow and never gates a step on its answer. */
export function useJoinTargetLookup(code: string): JoinTargetLookup {
  const [target, setTarget] = useState<JoinTarget | null>(null);
  const [targetCode, setTargetCode] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const lastLookedUp = useRef('');
  const lookupSeq = useRef(0);

  useEffect(() => {
    if (code.length !== JOIN_CODE_LENGTH) {
      setTarget(null);
      setIsChecking(false);
      // Forget the last code, or retyping the character just deleted never re-fetches.
      lastLookedUp.current = '';
      return;
    }
    if (code === lastLookedUp.current) return;
    lastLookedUp.current = code;
    const seq = ++lookupSeq.current;
    setIsChecking(true);
    void (async () => {
      let result: JoinTarget;
      try {
        result = await resolveJoinTarget(code);
      } catch {
        // A lookup we could not perform is not evidence of a bad code.
        result = { verdict: 'unverified' };
      }
      // A slower answer for an older code must not overwrite a newer one.
      if (seq !== lookupSeq.current) return;
      setTarget(result);
      setTargetCode(code);
      setIsChecking(false);
    })();
  }, [code]);

  return { target, targetCode, isChecking };
}
