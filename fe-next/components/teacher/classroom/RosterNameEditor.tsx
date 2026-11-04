'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { m } from 'framer-motion';
import { Check, Pencil } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { resolvePreset, useEduReducedMotion } from '@/lib/education/motion';
import { parseRosterName, ROSTER_NAME_MAX } from '@/lib/education/rosterName';

interface RosterNameEditorProps {
  rosterName: string | null;
  ownName: string;
  onSave: (next: string | null) => Promise<boolean>;
}

const SAVED_TICK_MS = 1400;

export function RosterNameEditor({ rosterName, ownName, onSave }: RosterNameEditorProps) {
  const { t } = useLanguage();
  const reduced = useEduReducedMotion();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [tooLong, setTooLong] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const editingRef = useRef(false);
  const errorId = useId();
  const shown = rosterName || ownName;

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  useEffect(() => {
    if (!justSaved) return;
    const id = setTimeout(() => setJustSaved(false), SAVED_TICK_MS);
    return () => clearTimeout(id);
  }, [justSaved]);

  const open = () => {
    setDraft(rosterName ?? '');
    setTooLong(false);
    editingRef.current = true;
    setEditing(true);
  };

  const close = () => {
    editingRef.current = false;
    setEditing(false);
  };

  const commit = () => {
    if (!editingRef.current) return;
    const parsed = parseRosterName(draft.trim() ? draft : null);
    if (!parsed.ok) {
      setTooLong(true);
      return;
    }
    close();
    if (parsed.value === (rosterName || null)) return;
    void onSave(parsed.value).then((saved) => setJustSaved(saved));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  const tick = resolvePreset('popIn', reduced);

  return (
    <div data-testid="roster-name" className="flex min-w-0 items-center gap-1.5">
      {editing ? (
        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            type="text"
            dir="auto"
            value={draft}
            placeholder={ownName}
            aria-label={t('eduRoster.inputLabel')}
            aria-invalid={tooLong}
            aria-describedby={tooLong ? errorId : undefined}
            enterKeyHint="done"
            autoComplete="off"
            onChange={(e) => {
              setDraft(e.target.value);
              setTooLong(false);
            }}
            onKeyDown={onKeyDown}
            onBlur={commit}
            className={cn(
              'h-11 w-full min-w-0 rounded-neo border-2 border-black bg-neo-white px-2 text-base font-neo-display font-black text-black',
              'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
              tooLong && 'border-neo-red',
            )}
          />
          {tooLong && (
            <p id={errorId} role="alert" className="mt-0.5 text-xs font-bold text-neo-red">
              {t('eduRoster.tooLong', { max: ROSTER_NAME_MAX })}
            </p>
          )}
        </div>
      ) : (
        <>
          <h4 dir="auto" title={shown} className="min-w-0 truncate text-black font-neo-display font-black text-base">
            {shown}
          </h4>
          <button
            type="button"
            data-testid="roster-rename"
            aria-label={t('eduRoster.rename', { name: shown })}
            title={t('eduRoster.rename', { name: shown })}
            onClick={open}
            className={cn(
              'grid size-11 shrink-0 place-items-center rounded-neo text-black/60 hover:text-black',
              'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
            )}
          >
            {justSaved ? (
              <m.span initial={tick.initial} animate={tick.animate} transition={tick.transition} className="grid place-items-center">
                <Check className="size-4 text-neo-green" strokeWidth={3} aria-hidden="true" />
              </m.span>
            ) : (
              <Pencil className="size-4" strokeWidth={2.5} aria-hidden="true" />
            )}
          </button>
        </>
      )}
    </div>
  );
}
