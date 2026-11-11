'use client';

import { useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import posthog from '@/lib/analytics/lazyPosthog';
import { isPlaceholderName } from '@/lib/displayName';
import { checkPublicName } from '@/lib/names/checkPublicName';
import type { ResultsMode } from '@/lib/rivals/types';
import { isDefaultPlayerName } from '@/utils/defaultPlayerNames';
import { getGuestFingerprint } from '@/utils/dailyChallenge/guestPlayer';
import { getChosenGuestName, getGuestName } from '@/utils/guestManager';
import { suggestPublicPlayerName } from '@/utils/onboardingNameSuggestions';
import { MAX_GUEST_NAME_LENGTH, useGuestNameSave } from '@/components/daily/results/useGuestNameSave';

export const PUBLIC_NAME_PROMPT_SHOWN_KEY = 'lexiclash_public_name_prompt_shown_at';

const looksPublic = (name: string | null | undefined) => !isPlaceholderName(name) && !isDefaultPlayerName(name);

export interface PublicNamePromptProps {
  mode: ResultsMode;
  onSaved?: (name: string) => void;
}

/** "Pick a name to show up on the board and get a rival": first thing in the results slot while the name can't go public. */
export function PublicNamePrompt({ mode, onSaved }: PublicNamePromptProps) {
  const { loading, isAuthenticated, profile, updateProfile } = useAuth();
  const { t, language } = useLanguage();
  const [suggestion] = useState(() => suggestPublicPlayerName(language));
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedName, setSavedName] = useState<string | null>(null);
  const shownRef = useRef(false);
  const [guestFp, setGuestFp] = useState<string | null>(null);

  const guestName = !isAuthenticated ? getGuestName() : null;
  // The daily fingerprint keys a guest's board rows; without it a save would only mark the name chosen.
  const guest = useGuestNameSave(guestName ?? '', guestFp, (n) => setSavedName(n), t);

  useEffect(() => {
    if (loading || isAuthenticated) return;
    let live = true;
    getGuestFingerprint().then((fp) => { if (live) setGuestFp(fp); }).catch(() => undefined);
    return () => { live = false; };
  }, [loading, isAuthenticated]);

  // Daily guests already get the daily flow's own name prompt; edu students never type names.
  const needsName = !loading && mode !== 'edu' && !savedName && (isAuthenticated
    ? !!profile && !looksPublic(profile.display_name || profile.username)
    : mode !== 'daily' && !getChosenGuestName());

  useEffect(() => {
    if (!needsName || shownRef.current) return;
    shownRef.current = true;
    try {
      localStorage.setItem(PUBLIC_NAME_PROMPT_SHOWN_KEY, new Date().toISOString());
    } catch {
      // storage blocked: the prompt still works, it just can't remember
    }
    posthog.capture('public_name_prompt_shown', { mode, guest: !isAuthenticated });
  }, [needsName, mode, isAuthenticated]);

  if (!needsName) return null;

  const save = async () => {
    const name = draft.trim().slice(0, MAX_GUEST_NAME_LENGTH);
    if (!name) return;
    setSaving(true);
    setError(null);
    try {
      const issue = await checkPublicName(name);
      if (issue) {
        setError(t(`publicName.error.${issue}`));
        return;
      }
      if (isAuthenticated) {
        const { error: saveError } = await updateProfile({ display_name: name });
        if (saveError) {
          setError(t('publicName.saveFailed'));
          return;
        }
      } else if (!(await guest.save(name, 'prompt'))) {
        return;
      }
      posthog.capture('public_name_prompt_saved', { mode, guest: !isAuthenticated, used_suggestion: name === suggestion });
      setSavedName(name);
      onSaved?.(name);
    } finally {
      setSaving(false);
    }
  };

  const shownError = error ?? guest.error;

  return (
    <m.form
      data-testid="public-name-prompt"
      initial={{ scale: 0.96, y: 8 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="flex flex-col gap-2 p-3 rounded-neo border-3 border-neo-black bg-neo-navy shadow-hard"
    >
      <p className="font-neo-display font-black text-base text-neo-yellow">{t('publicName.promptTitle')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-neo-white/70">{t('publicName.tryThis')}</span>
        <button
          type="button"
          dir="auto"
          onClick={() => setDraft(suggestion)}
          className="px-2.5 py-1 rounded-full border-2 border-neo-black bg-neo-cyan text-neo-black text-sm font-black shadow-hard-sm"
        >
          {suggestion}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          dir="auto"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
            guest.clearError();
          }}
          maxLength={MAX_GUEST_NAME_LENGTH}
          autoComplete="nickname"
          enterKeyHint="done"
          placeholder={t('publicName.placeholder')}
          aria-label={t('publicName.promptTitle')}
          className="flex-1 min-w-0 px-3 py-2 rounded-neo border-2 border-neo-cyan bg-neo-navy-elevated text-neo-white font-bold placeholder:text-neo-white/40"
        />
        <button
          type="submit"
          data-testid="public-name-save"
          disabled={saving || guest.saving || !draft.trim() || (!isAuthenticated && !guestFp)}
          className="shrink-0 px-3 py-2 rounded-neo border-2 border-neo-black bg-neo-lime text-neo-black font-black shadow-hard-sm disabled:opacity-50"
        >
          {t('publicName.save')}
        </button>
      </div>
      {shownError && <p role="alert" className="text-xs font-bold text-neo-red">{shownError}</p>}
    </m.form>
  );
}

export default PublicNamePrompt;
