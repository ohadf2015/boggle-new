'use client';

/**
 * Families Policy — adult management of social features.
 *
 * Satisfies "provide a method for adults to manage social features … enabling/
 * disabling the social feature or selecting different levels of functionality".
 *
 * Authorization is server-side: /api/account/social-settings derives the
 * caller's tier from their STORED birth_year (never a body field), so a child
 * cannot self-elevate. This screen therefore only exposes the toggles to an
 * adult account; a non-adult sees an explanatory message (and the age screen if
 * their age is unknown). The override can only reduce an adult's own surfaces.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSocialCapabilities } from '@/hooks/useSocialCapabilities';
import { AgeGateModal } from '@/components/families/AgeGateModal';

type ManagedKey = 'publicRoomChat' | 'friendMessaging' | 'friendManagement' | 'customDisplayName';

export default function ParentalControlsPageClient() {
  const { t } = useLanguage();
  const { refreshProfile } = useAuth();
  const { tier, caps, needsAgeGate } = useSocialCapabilities();

  const [showAgeGate, setShowAgeGate] = useState(false);
  const [values, setValues] = useState<Record<ManagedKey, boolean>>({
    publicRoomChat: caps.publicRoomChat,
    friendMessaging: caps.friendMessaging,
    friendManagement: caps.friendManagement,
    customDisplayName: caps.customDisplayName,
  });
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');

  const toggle = (key: ManagedKey) => setValues((v) => ({ ...v, [key]: !v[key] }));

  const handleSave = async () => {
    setSaving(true);
    setSaveState('idle');
    try {
      const res = await fetch('/api/account/social-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // No birth year in the body — the server authorizes from stored identity.
        body: JSON.stringify({ override: values }),
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
    { key: 'customDisplayName', label: t('familiesSafety.pcDisplayNameLabel') },
  ];

  return (
    <main className="mx-auto max-w-md p-6 font-neo-body text-neo-white">
      <h1 className="mb-2 text-2xl font-neo-display text-neo-cyan">
        {t('familiesSafety.pcTitle')}
      </h1>
      <p className="mb-6 text-sm text-neo-cream">{t('familiesSafety.pcIntro')}</p>

      {tier !== 'adult' ? (
        <div className="space-y-3">
          <p className="text-sm text-neo-cream">{t('familiesSafety.pcAdultOnly')}</p>
          {needsAgeGate && (
            <Button variant="cyan" className="w-full" onClick={() => setShowAgeGate(true)}>
              {t('familiesSafety.chatAddAge')}
            </Button>
          )}
          <AgeGateModal
            isOpen={showAgeGate}
            onClose={() => setShowAgeGate(false)}
            onResolved={() => setShowAgeGate(false)}
          />
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
