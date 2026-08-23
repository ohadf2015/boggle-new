'use client';

/**
 * ComebackBonusWrapper
 *
 * Checks comeback eligibility on mount (for logged-in users).
 * Shows ComebackBonusModal once per session when eligible.
 */

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithAuth } from '@/utils/authFetch';
import { ComebackBonusModal } from '@/components/engagement/ComebackBonusModal';
import type { ComebackStatus } from '@/shared/types/engagement';

const SESSION_KEY = 'comeback_bonus_checked';

export default function ComebackBonusWrapper() {
  const { user, profile } = useAuth();
  const [status, setStatus] = useState<ComebackStatus | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const checked = useRef(false);

  useEffect(() => {
    if (!user?.id) return;
    // Only check once per browser session
    if (checked.current || sessionStorage.getItem(SESSION_KEY)) return;
    // Suppress on conversion surfaces (e.g. checkout pages) where overlays block CTAs
    if (document.body.classList.contains('conversion-surface')) return;

    checked.current = true;

    (async () => {
      try {
        const response = await fetchWithAuth('/api/engagement/comeback');
        if (!response.ok) return;
        const data: ComebackStatus = await response.json();
        if (data.eligible && data.tier) {
          setStatus(data);
          setIsOpen(true);
        }
      } catch {
        // non-critical — silently ignore
      } finally {
        sessionStorage.setItem(SESSION_KEY, '1');
      }
    })();
  }, [user?.id]);

  if (!status?.eligible || !status.tier) return null;

  return (
    <ComebackBonusModal
      isOpen={isOpen}
      daysAway={status.daysAway ?? 0}
      tier={status.tier}
      playerName={profile?.display_name || profile?.username}
      onClose={() => setIsOpen(false)}
      onClaimed={() => setIsOpen(false)}
    />
  );
}
