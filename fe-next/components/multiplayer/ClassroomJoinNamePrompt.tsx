'use client';

import React, { useCallback, useState } from 'react';
import { GraduationCap, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { validateUsername } from '@/utils/validation';
import { cn } from '@/lib/utils';

interface ClassroomJoinNamePromptProps {
  /** The room this student is walking into — shown so they can check the board. */
  roomCode: string;
  /** Called with the trimmed, validated name. */
  onSubmit: (name: string) => void;
  /** Prefill, e.g. a stored-but-incomplete guest name. */
  initialName?: string;
  disabled?: boolean;
}

/**
 * The one screen between a nameless student and their teacher's room.
 *
 * Deliberately a plain inline form rather than the shared `JoinRoomModal`:
 *
 *  - `JoinRoomModal` PERSISTS a generated name on open (`getOrCreateStoredUsername`).
 *    A student who once opened it would silently auto-join every later game under a
 *    machine name, and land on the teacher's roster as one.
 *  - It is dismissible, and its close handler resets the flow to the public room
 *    list — which, inside classroom mode, renders the waiting spinner again. A
 *    dismiss path back to the dead end is the dead end.
 *
 * So: no dismiss, no avatar step, no generated fallback. Type a name, play.
 */
export const ClassroomJoinNamePrompt: React.FC<ClassroomJoinNamePromptProps> = ({
  roomCode,
  onSubmit,
  initialName = '',
  disabled = false,
}) => {
  const { t } = useLanguage();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = name.trim();
      const validation = validateUsername(trimmed);
      if (!validation.isValid) {
        setError(validation.error ?? 'validation.usernameRequired');
        return;
      }
      setError(null);
      onSubmit(trimmed);
    },
    [name, onSubmit]
  );

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      <form
        data-testid="classroom-name-prompt"
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-neo-lg border-neo-thick border-neo-black bg-neo-navy-light/90 shadow-hard-lg p-5 sm:p-6"
      >
        <div className="flex items-center gap-2 text-neo-cyan font-bold mb-1">
          <GraduationCap className="w-5 h-5" />
          <span className="font-neo-body text-sm uppercase tracking-wide">
            {t('education.classroomGame.namePrompt.eyebrow')}
          </span>
        </div>

        <h2 className="text-2xl font-black text-neo-white mb-1 text-start">
          {t('education.classroomGame.namePrompt.title')}
        </h2>
        <p className="text-sm text-neo-white/80 font-neo-body mb-4 text-start">
          {t('education.classroomGame.namePrompt.subtitle')}
        </p>

        <label htmlFor="classroom-name-input" className="sr-only">
          {t('education.classroomGame.namePrompt.title')}
        </label>
        <input
          id="classroom-name-input"
          data-testid="classroom-name-input"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          maxLength={20}
          autoFocus
          autoComplete="off"
          placeholder={t('education.classroomGame.namePrompt.placeholder')}
          aria-invalid={!!error}
          className={cn(
            'w-full rounded-neo border-neo border-neo-black bg-neo-cream text-neo-black',
            'px-4 py-3 text-lg font-bold text-start shadow-hard-sm',
            'focus:outline-hidden focus:ring-3 focus:ring-neo-cyan',
            error && 'ring-3 ring-neo-red'
          )}
        />

        {error && (
          <p data-testid="classroom-name-error" className="mt-2 text-sm font-bold text-neo-red font-neo-body">
            {t(error)}
          </p>
        )}

        <button
          type="submit"
          data-testid="classroom-name-submit"
          disabled={disabled}
          className={cn(
            'mt-4 w-full flex items-center justify-center gap-2 py-3 px-4',
            'rounded-neo border-neo-thick border-neo-black bg-neo-lime text-neo-black',
            'font-black uppercase tracking-wide shadow-hard',
            'active:translate-y-0.5 active:shadow-none transition-all',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span>{t('education.classroomGame.namePrompt.submit')}</span>
          <ArrowRight className="w-5 h-5 rtl:scale-x-[-1]" />
        </button>

        <p className="mt-3 text-center text-xs font-neo-body text-neo-white/70">
          {t('education.classroomGame.namePrompt.roomLabel', { code: roomCode })}
        </p>
      </form>
    </div>
  );
};

export default ClassroomJoinNamePrompt;
