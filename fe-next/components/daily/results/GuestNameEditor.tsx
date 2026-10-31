'use client';

import { useState } from 'react';
import { hasChosenGuestName } from '@/utils/guestManager';
import { isDefaultPlayerName } from '@/utils/defaultPlayerNames';
import { GuestNamePrompt } from './GuestNamePrompt';
import { MAX_GUEST_NAME_LENGTH, useGuestNameSave, type GuestNameSource, type GuestNameT } from './useGuestNameSave';

interface GuestNameEditorProps {
  name: string;
  guestFingerprint: string | null;
  /** Today's rank and field size, when known, so the prompt can open on the guest's result. */
  rank?: number | null;
  totalPlayers?: number | null;
  onRenamed: (name: string) => void;
  t: GuestNameT;
}

export function GuestNameEditor({ name, guestFingerprint, rank, totalPlayers, onRenamed, t }: GuestNameEditorProps) {
  // A guest who never picked a name is asked once, right after the finish, so
  // the board shows a real name rather than "Sneaky Potato".
  const [prompting, setPrompting] = useState(() => !!guestFingerprint && !hasChosenGuestName());
  const [editing, setEditing] = useState<GuestNameSource | null>(null);
  const [draft, setDraft] = useState(name);
  const { save, saving, error, clearError } = useGuestNameSave(name, guestFingerprint, onRenamed, t);
  const isDefault = isDefaultPlayerName(name);

  if (prompting) {
    return (
      <GuestNamePrompt
        name={name}
        guestFingerprint={guestFingerprint}
        rank={rank}
        totalPlayers={totalPlayers}
        onRenamed={onRenamed}
        onDone={() => setPrompting(false)}
        t={t}
      />
    );
  }

  const startEditing = (source: GuestNameSource) => {
    setDraft(source === 'nudge' ? '' : name);
    clearError();
    setEditing(source);
  };

  if (!editing) {
    // Still on a generated name (kept it, or picked one up before the prompt
    // existed): say so, and offer to swap it, without blocking anything.
    if (isDefault) {
      return (
        <div
          data-testid="guest-name-default-nudge"
          className="w-full flex items-center gap-2 mb-2 px-3 py-2 rounded-neo border-2 border-neo-yellow bg-neo-yellow/10 text-sm text-neo-white"
        >
          <span className="min-w-0 flex-1">
            {t('wordHunt.results.guestNameDefaultNudge', "You're on the board as {name}, a random name. Make this score yours.", { name })}
          </span>
          <button
            type="button"
            onClick={() => startEditing('nudge')}
            disabled={!guestFingerprint}
            className="shrink-0 px-2 py-1 rounded-neo border-2 border-neo-black bg-neo-yellow text-neo-black text-xs font-bold shadow-hard-sm disabled:opacity-50"
          >
            {t('wordHunt.results.guestNameUseMine', 'Use my name')}
          </button>
        </div>
      );
    }
    return (
      <div className="w-full flex items-center gap-2 mb-2 px-3 py-2 rounded-neo border-2 border-neo-white/10 bg-neo-black/25 text-sm text-neo-white">
        <span className="min-w-0 flex-1 truncate">
          <span className="text-neo-white/70">{t('wordHunt.results.guestNameLabel', 'On the leaderboard as')}</span>{' '}
          <span className="font-bold">{name}</span>
        </span>
        <button
          type="button"
          onClick={() => startEditing('edit')}
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
      className="flex flex-col items-center gap-1 mb-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft.trim()) {
          setEditing(null);
          return;
        }
        void save(draft, editing).then((ok) => ok && setEditing(null));
      }}
    >
      <div className="flex items-center gap-2 w-full max-w-xs">
        <input
          type="text"
          value={draft}
          placeholder={t('wordHunt.results.guestNamePlaceholder', 'Your name')}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setEditing(null)}
          maxLength={MAX_GUEST_NAME_LENGTH}
          autoComplete="nickname"
          autoFocus
          aria-label={t('wordHunt.results.guestNameLabel', 'On the leaderboard as')}
          className="flex-1 min-w-0 px-3 py-1.5 rounded-neo border-2 border-neo-cyan bg-neo-navy-light text-neo-white font-bold placeholder:text-neo-white/40"
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
