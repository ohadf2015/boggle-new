'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_KEY = 'lexiclash_modal_cooldown';
const MAX_MODALS_PER_SESSION = 2;
const COOLDOWN_MS = 30_000; // 30s between modals

interface ModalRecord {
  id: string;
  shownAt: number;
}

function getShownModals(): ModalRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function recordModalShown(id: string): void {
  const records = getShownModals();
  records.push({ id, shownAt: Date.now() });
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/**
 * Controls whether a modal can show, based on a session-wide budget.
 * - Max 2 modals per session (resets on page refresh)
 * - 30s cooldown between modals
 * - Critical modals (auth, errors) can bypass with `force: true`
 *
 * Usage:
 *   const { canShow, markShown } = useModalCooldown('comeback-bonus');
 *   if (canShow && shouldShowBonus) { ... }
 */
export function useModalCooldown(modalId: string) {
  const [canShow, setCanShow] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    const records = getShownModals();
    const totalShown = records.length;
    const lastShown = records[records.length - 1];
    const now = Date.now();

    const withinBudget = totalShown < MAX_MODALS_PER_SESSION;
    const cooledDown = !lastShown || (now - lastShown.shownAt) >= COOLDOWN_MS;
    const notAlreadyShown = !records.some((r) => r.id === modalId);

    setCanShow(withinBudget && cooledDown && notAlreadyShown);
  }, [modalId]);

  const markShown = useCallback(() => {
    recordModalShown(modalId);
    setCanShow(false);
  }, [modalId]);

  return { canShow, markShown };
}
