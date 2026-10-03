'use client';

import { useState } from 'react';
import { saveGuestNameEverywhere } from '@/utils/guestManager';

const MAX_NAME_LENGTH = 20;

interface GuestNameEditorProps {
  name: string;
  guestFingerprint: string | null;
  onRenamed: (name: string) => void;
  t: (key: string, fallback?: string) => string;
}

export function GuestNameEditor({ name, guestFingerprint, onRenamed, t }: GuestNameEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setDraft(name);
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    const trimmed = draft.trim().slice(0, MAX_NAME_LENGTH);
    if (!trimmed || trimmed === name || !guestFingerprint) {
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
      onRenamed(body.displayName);
      setEditing(false);
    } catch {
      setError(t('wordHunt.results.guestNameFailed', "Couldn't save your name. Try again."));
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-neo-white">
        <span className="text-neo-white/70">{t('wordHunt.results.guestNameLabel', 'On the leaderboard as')}</span>
        <span className="font-bold truncate max-w-[12rem]">{name}</span>
        <button
          type="button"
          onClick={startEditing}
          disabled={!guestFingerprint}
          className="px-2 py-0.5 rounded-neo border-2 border-neo-cyan text-neo-cyan text-xs font-bold shadow-hard-sm disabled:opacity-50"
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
