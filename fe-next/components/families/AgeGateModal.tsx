'use client';

/**
 * Families Policy — neutral age screen.
 *
 * Asks for a birth YEAR with NO pre-selected value and neutral wording (no
 * "must be 13+" hint, no nudging to inflate). Authed users persist server-side
 * via /api/account/age; guests persist locally and replay via the socket
 * handshake. After resolving, the caller re-reads capabilities.
 */

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSocialCapabilities } from '@/hooks/useSocialCapabilities';

interface AgeGateModalProps {
  isOpen: boolean;
  /** Called after the age is saved (so the caller can refresh sockets/profile). */
  onResolved: () => void;
  /** Optional dismissal — closing without answering leaves the user restricted. */
  onClose?: () => void;
}

export function AgeGateModal({ isOpen, onResolved, onClose }: AgeGateModalProps) {
  const { t } = useLanguage();
  const { isAuthenticated, refreshProfile } = useAuth();
  const { setGuestBirthYear } = useSocialCapabilities();
  const [year, setYear] = useState<string>(''); // neutral: no default
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear; y >= currentYear - 100; y -= 1) list.push(y);
    return list;
  }, [currentYear]);

  const handleSubmit = async () => {
    const birthYear = Number(year);
    if (!Number.isInteger(birthYear)) {
      setError(true);
      return;
    }
    setSaving(true);
    setError(false);
    try {
      if (isAuthenticated) {
        const res = await fetch('/api/account/age', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ birthYear }),
        });
        if (!res.ok) throw new Error('save failed');
        await refreshProfile();
      } else {
        setGuestBirthYear(birthYear);
      }
      onResolved();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('familiesSafety.ageGateTitle')}</DialogTitle>
          <DialogDescription>{t('familiesSafety.ageGateMessage')}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <label htmlFor="age-gate-year" className="block text-sm font-neo-body mb-2 text-neo-cream">
            {t('familiesSafety.birthYearLabel')}
          </label>
          <select
            id="age-gate-year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full rounded-neo border-neo border-black bg-neo-navy-light p-3 text-neo-white font-neo-body"
          >
            <option value="" disabled>
              {t('familiesSafety.birthYearPlaceholder')}
            </option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {error && (
            <p className="mt-2 text-sm text-neo-red" role="alert">
              {t('familiesSafety.ageGateError')}
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={year === '' || saving}
            variant="cyan"
            className="w-full"
          >
            {saving ? t('familiesSafety.saving') : t('familiesSafety.ageGateConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AgeGateModal;
