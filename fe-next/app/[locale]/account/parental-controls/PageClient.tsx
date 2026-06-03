'use client';

/**
 * Families Policy — adult management of social features.
 *
 * Satisfies "provide a method for adults to manage social features for child
 * users, including enabling/disabling the social feature or selecting different
 * levels of functionality". The toggles are locked behind an adult-action gate
 * (enter an adult's birth year — a policy-accepted mechanism) and persist the
 * per-capability override via /api/account/social-settings, which the server
 * re-applies everywhere through the shared capability resolver.
 */

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSocialCapabilities } from '@/hooks/useSocialCapabilities';
import { computeSocialTier } from '@/lib/families/socialPolicy';

type ManagedKey = 'publicRoomChat' | 'friendMessaging' | 'friendManagement';

export default function ParentalControlsPageClient() {
  const { t } = useLanguage();
  const { refreshProfile } = useAuth();
  const { caps } = useSocialCapabilities();

  const [unlocked, setUnlocked] = useState(false);
  const [adultYear, setAdultYear] = useState('');
  const [gateError, setGateError] = useState(false);

  const [values, setValues] = useState<Record<ManagedKey, boolean>>({
    publicRoomChat: caps.publicRoomChat,
    friendMessaging: caps.friendMessaging,
    friendManagement: caps.friendManagement,
  });
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');

  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear; y >= currentYear - 100; y -= 1) list.push(y);
    return list;
  }, [currentYear]);

  const handleUnlock = () => {
    const year = Number(adultYear);
    if (computeSocialTier(year, currentYear) !== 'adult') {
      setGateError(true);
      return;
    }
    setGateError(false);
    setUnlocked(true);
  };

  const toggle = (key: ManagedKey) =>
    setValues((v) => ({ ...v, [key]: !v[key] }));

  const handleSave = async () => {
    setSaving(true);
    setSaveState('idle');
    try {
      const res = await fetch('/api/account/social-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ override: values, adultBirthYear: Number(adultYear) }),
      });
      if (!res.ok) throw new Error('save failed');
      await refreshProfile();
      setSaveState('saved');
    } catch {
      setSaveState('error');
    } finally {
      setSaving(false);
    }
  };

  const rows: { key: ManagedKey; label: string }[] = [
    { key: 'publicRoomChat', label: t('familiesSafety.pcChatLabel') },
    { key: 'friendMessaging', label: t('familiesSafety.pcFriendMsgLabel') },
    { key: 'friendManagement', label: t('familiesSafety.pcFriendMgmtLabel') },
  ];

  return (
    <main className="mx-auto max-w-md p-6 font-neo-body text-neo-white">
      <h1 className="mb-2 text-2xl font-neo-display text-neo-cyan">
        {t('familiesSafety.pcTitle')}
      </h1>
      <p className="mb-6 text-sm text-neo-cream">{t('familiesSafety.pcIntro')}</p>

      {!unlocked ? (
        <div className="space-y-3">
          <label htmlFor="pc-adult-year" className="block text-sm">
            {t('familiesSafety.pcAdultGateLabel')}
          </label>
          <select
            id="pc-adult-year"
            value={adultYear}
            onChange={(e) => setAdultYear(e.target.value)}
            className="w-full rounded-neo border-neo border-black bg-neo-navy-light p-3 text-neo-white"
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
          {gateError && (
            <p className="text-sm text-neo-red" role="alert">
              {t('familiesSafety.pcAdultError')}
            </p>
          )}
          <Button variant="cyan" className="w-full" disabled={adultYear === ''} onClick={handleUnlock}>
            {t('familiesSafety.pcUnlock')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-4">
                <span className="text-sm">{row.label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={values[row.key]}
                  aria-label={row.label}
                  onClick={() => toggle(row.key)}
                  className={`h-7 w-12 shrink-0 rounded-full border-neo border-black transition-colors ${
                    values[row.key] ? 'bg-neo-lime' : 'bg-neo-navy-light'
                  }`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-black transition-transform ${
                      values[row.key] ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </li>
            ))}
          </ul>

          <Button variant="cyan" className="w-full" disabled={saving} onClick={handleSave}>
            {t('familiesSafety.pcSave')}
          </Button>
          {saveState === 'saved' && (
            <p className="text-sm text-neo-lime" role="status">
              {t('familiesSafety.pcSaved')}
            </p>
          )}
          {saveState === 'error' && (
            <p className="text-sm text-neo-red" role="alert">
              {t('familiesSafety.pcSaveError')}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
