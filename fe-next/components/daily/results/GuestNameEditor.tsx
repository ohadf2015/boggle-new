'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { hasChosenGuestName, markGuestNameChosen, saveGuestNameEverywhere } from '@/utils/guestManager';
import { useGrowthRadarFlag } from '@/hooks/useGrowthRadarFlag';

const MAX_NAME_LENGTH = 20;
// Growth Radar A/B (rec 11904): control = forced prompt, keep_name = skippable.
const SKIP_EXPERIMENT_KEY = 'daily-guest-name-skip';

interface GuestNameEditorProps {
  name: string;
  guestFingerprint: string | null;
  onRenamed: (name: string) => void;
  t: (key: string, fallback?: string) => string;
}

export function GuestNameEditor({ name, guestFingerprint, onRenamed, t }: GuestNameEditorProps) {
  // A guest still on the auto-generated name is asked once, right after the
  // finish, so the board shows a real name rather than "WordNinja".
  const [prompting, setPrompting] = useState(() => !!guestFingerprint && !hasChosenGuestName());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => (prompting ? '' : name));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canKeepName = useGrowthRadarFlag(SKIP_EXPERIMENT_KEY, prompting) === 'keep_name';

  const startEditing = () => {
    setDraft(name);
    setError(null);
    setEditing(true);
  };

  const keepName = () => {
    markGuestNameChosen();
    setPrompting(false);
  };

  const save = async () => {
    const trimmed = draft.trim().slice(0, MAX_NAME_LENGTH);
    if (prompting && !trimmed) return;
    if (!trimmed || trimmed === name || !guestFingerprint) {
      if (prompting) keepName();
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/daily-challenge/guest-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestFingerprint, displayName: trimmed }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error === 'profane'
          ? t('wordHunt.results.guestNameRejected', 'Pick a different name')
          : t('wordHunt.results.guestNameFailed', "Couldn't save your name. Try again."));
        return;
      }
      saveGuestNameEverywhere(body.displayName);
      markGuestNameChosen();
      onRenamed(body.displayName);
      setPrompting(false);
      setEditing(false);
    } catch {
      setError(t('wordHunt.results.guestNameFailed', "Couldn't save your name. Try again."));
    } finally {
      setSaving(false);
    }
  };

  if (prompting) {
    return (
      <Dialog open onOpenChange={() => {}}>
        <DialogContent
          hideCloseButton
          noDescription
          className="max-w-sm"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <form
            data-testid="guest-name-prompt"
            className="flex flex-col gap-3 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <DialogTitle className="font-neo-display font-black text-lg">
              {t('wordHunt.results.guestNamePrompt', 'Save your score under your name')}
            </DialogTitle>
            <p className="text-sm font-bold opacity-70">
              {t('wordHunt.results.guestNameWhy', 'Your name shows on today\'s leaderboard.')}
            </p>
            <div className="flex items-center gap-2">
              <input
                id="guest-name-prompt-input"
                type="text"
                value={draft}
                placeholder={name}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={MAX_NAME_LENGTH}
                autoComplete="nickname"
                enterKeyHint="done"
                autoFocus
                aria-label={t('wordHunt.results.guestNamePrompt', 'Save your score under your name')}
                className="flex-1 min-w-0 px-3 py-2 rounded-neo border-2 border-neo-cyan bg-neo-navy text-neo-white font-bold placeholder:text-neo-white/40"
              />
              <button
                type="submit"
                disabled={saving || !draft.trim()}
                className="shrink-0 px-3 py-2 rounded-neo border-2 border-neo-black bg-neo-lime text-neo-black font-bold shadow-hard-sm disabled:opacity-50"
              >
                {t('common.save', 'Save')}
              </button>
            </div>
            {error && <p role="alert" className="text-xs text-neo-red font-bold">{error}</p>}
            {canKeepName && (
              <button
                type="button"
                onClick={keepName}
                className="self-start text-xs font-bold opacity-70 underline underline-offset-2"
              >
                {t('wordHunt.results.guestNameKeep', 'Keep this name')}
              </button>
            )}
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  if (!editing) {
    return (
      <div className="w-full flex items-center gap-2 mb-2 px-3 py-2 rounded-neo border-2 border-neo-white/10 bg-neo-black/25 text-sm text-neo-white">
        <span className="min-w-0 flex-1 truncate">
          <span className="text-neo-white/70">{t('wordHunt.results.guestNameLabel', 'On the leaderboard as')}</span>{' '}
          <span className="font-bold">{name}</span>
        </span>
        <button
          type="button"
          onClick={startEditing}
          disabled={!guestFingerprint}
          className="shrink-0 px-2 py-0.5 rounded-neo border-2 border-neo-cyan text-neo-cyan text-xs font-bold shadow-hard-sm disabled:opacity-50"
        >
          {t('playerView.editName', 'Change name')}
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="flex items-center gap-2 w-full max-w-xs">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
          maxLength={MAX_NAME_LENGTH}
          autoFocus
          aria-label={t('wordHunt.results.guestNameLabel', 'On the leaderboard as')}
          className="flex-1 min-w-0 px-3 py-1.5 rounded-neo border-2 border-neo-cyan bg-neo-navy-light text-neo-white font-bold"
        />
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-1.5 rounded-neo border-2 border-neo-black bg-neo-lime text-neo-black font-bold shadow-hard-sm disabled:opacity-50"
        >
          {t('common.save', 'Save')}
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-neo-pink font-bold">{error}</p>}
    </form>
  );
}
