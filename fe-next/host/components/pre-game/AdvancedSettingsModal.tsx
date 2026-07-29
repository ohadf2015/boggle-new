'use client';

import React, { memo, useCallback, useEffect, useState } from 'react';
import { Settings, Timer, Grid3X3, Type, Globe } from 'lucide-react';
import { m } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';
import { cn } from '../../../lib/utils';
import { formatTimeMMSS } from '@/shared/utils';
import type { Language, DifficultyLevel } from '@/shared/types/game';

interface AdvancedSettingsModalProps {
  timerValue: number;
  setTimerValue: React.Dispatch<React.SetStateAction<number>>;
  difficulty: DifficultyLevel;
  setDifficulty: React.Dispatch<React.SetStateAction<DifficultyLevel>>;
  minWordLength: number;
  setMinWordLength: React.Dispatch<React.SetStateAction<number>>;
  roomLanguage: Language;
  onRoomLanguageChange: (lang: Language) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

// Minutes. 1.5 (= 1:30) is the default round length for classic MP.
const TIMER_OPTIONS = [1, 1.5, 2, 3];

/** Whole minutes render as "N min"; fractional minutes as MM:SS (e.g. 1.5 → "1:30"). */
const formatTimerOption = (minutes: number, t: (k: string) => string): string =>
  Number.isInteger(minutes) ? `${minutes} ${t('hostView.min')}` : formatTimeMMSS(minutes * 60);
const DIFFICULTY_OPTIONS: { key: DifficultyLevel; labelKey: string; board: string }[] = [
  { key: 'EASY', labelKey: 'hostView.presetEasy', board: '5×5' },
  { key: 'MEDIUM', labelKey: 'hostView.presetParty', board: '6×6' },
  { key: 'HARD', labelKey: 'hostView.presetChallenge', board: '7×7' },
];
const MIN_WORD_OPTIONS = [2, 3, 4];
const LANGUAGE_OPTIONS: { code: Language; flag: string; labelKey: string }[] = [
  { code: 'en', flag: '🇺🇸', labelKey: 'joinView.english' },
  { code: 'he', flag: '🇮🇱', labelKey: 'joinView.hebrew' },
  { code: 'sv', flag: '🇸🇪', labelKey: 'joinView.swedish' },
  { code: 'ja', flag: '🇯🇵', labelKey: 'joinView.japanese' },
  { code: 'es', flag: '🇪🇸', labelKey: 'joinView.spanish' },
];

export const AdvancedSettingsModal = memo<AdvancedSettingsModalProps>(function AdvancedSettingsModal({
  timerValue,
  setTimerValue,
  difficulty,
  setDifficulty,
  minWordLength,
  setMinWordLength,
  roomLanguage,
  onRoomLanguageChange,
  t,
}) {
  const [open, setOpen] = useState(false);
  const [draftTimer, setDraftTimer] = useState(timerValue);
  const [draftDifficulty, setDraftDifficulty] = useState<DifficultyLevel>(difficulty);
  const [draftMinWord, setDraftMinWord] = useState(minWordLength);
  const [draftLang, setDraftLang] = useState<Language>(roomLanguage);

  // Sync drafts from props each time modal opens, so reopening after Cancel
  // shows committed state (not stale drafts from previous discarded session).
  useEffect(() => {
    if (open) {
      setDraftTimer(timerValue);
      setDraftDifficulty(difficulty);
      setDraftMinWord(minWordLength);
      setDraftLang(roomLanguage);
    }
  }, [open, timerValue, difficulty, minWordLength, roomLanguage]);

  const handleSave = useCallback(() => {
    setTimerValue(draftTimer);
    setDifficulty(draftDifficulty);
    setMinWordLength(draftMinWord);
    if (draftLang !== roomLanguage) onRoomLanguageChange(draftLang);
    setOpen(false);
  }, [
    draftTimer,
    draftDifficulty,
    draftMinWord,
    draftLang,
    roomLanguage,
    setTimerValue,
    setDifficulty,
    setMinWordLength,
    onRoomLanguageChange,
  ]);

  const handleCancel = useCallback(() => setOpen(false), []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <m.button
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-neo border-2 border-neo-white/20 bg-white/5 text-neo-cream/70 text-xs font-bold uppercase hover:bg-white/10 hover:border-neo-white/30 transition-all"
          aria-label={t('hostView.advancedSettings')}
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('hostView.settings')}</span>
        </m.button>
      </DialogTrigger>
      <DialogContent
        noDescription
        className="bg-neo-navy border-3 border-neo-black shadow-hard-xl max-w-sm mx-auto p-0 overflow-hidden rounded-neo"
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b-2 border-neo-white/10">
          <DialogTitle className="text-lg font-black uppercase text-neo-cream font-neo-display">
            {t('hostView.advancedSettings')}
          </DialogTitle>
        </div>

        <div className="p-4 space-y-5">
          {/* Timer */}
          <SettingRow
            icon={<Timer className="w-4 h-4" />}
            label={t('hostView.timer')}
          >
            <div className="flex gap-1.5">
              {TIMER_OPTIONS.map((val) => (
                <ChipButton
                  key={val}
                  active={draftTimer === val}
                  onClick={() => setDraftTimer(val)}
                  label={formatTimerOption(val, t)}
                />
              ))}
            </div>
          </SettingRow>

          {/* Board Size / Difficulty */}
          <SettingRow
            icon={<Grid3X3 className="w-4 h-4" />}
            label={t('hostView.presetDrawerBoard')}
          >
            <div className="flex gap-1.5">
              {DIFFICULTY_OPTIONS.map(({ key, board }) => (
                <ChipButton
                  key={key}
                  active={draftDifficulty === key}
                  onClick={() => setDraftDifficulty(key)}
                  label={board}
                />
              ))}
            </div>
          </SettingRow>

          {/* Min Word Length */}
          <SettingRow
            icon={<Type className="w-4 h-4" />}
            label={t('hostView.presetDrawerMinWord')}
          >
            <div className="flex gap-1.5">
              {MIN_WORD_OPTIONS.map((val) => (
                <ChipButton
                  key={val}
                  active={draftMinWord === val}
                  onClick={() => setDraftMinWord(val)}
                  label={`${val} ${t('hostView.presetDrawerLetters')}`}
                />
              ))}
            </div>
          </SettingRow>

          {/* Language — chips (one-tap) avoid Radix Select-in-Dialog click bug
              that intermittently swallowed the change inside the CrazyGames iframe. */}
          <SettingRow
            icon={<Globe className="w-4 h-4" />}
            label={t('joinView.selectLanguage')}
          >
            <div className="grid grid-cols-3 gap-1.5">
              {LANGUAGE_OPTIONS.map(({ code, flag, labelKey }) => {
                const active = draftLang === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setDraftLang(code)}
                    aria-pressed={active}
                    aria-label={t(labelKey)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 px-2 py-2 rounded-neo border-2 text-xs font-bold uppercase transition-all',
                      active
                        ? 'bg-neo-lime text-neo-black border-neo-black shadow-hard-sm'
                        : 'bg-white/5 text-neo-cream/70 border-neo-white/15 hover:border-neo-white/30 hover:bg-white/10'
                    )}
                  >
                    <span className="text-base leading-none" aria-hidden>{flag}</span>
                    <span>{t(labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </SettingRow>
        </div>

        {/* Footer: Save / Cancel */}
        <div className="flex gap-2 px-4 py-3 border-t-2 border-neo-white/10 bg-neo-navy-light/40">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 px-3 py-2 rounded-neo border-2 border-neo-white/20 bg-white/5 text-neo-cream/80 text-sm font-bold uppercase hover:bg-white/10 hover:border-neo-white/30 transition-all"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 px-3 py-2 rounded-neo border-2 border-neo-black bg-neo-lime text-neo-black text-sm font-black uppercase shadow-hard-sm hover:translate-y-[-1px] active:translate-y-0 active:shadow-hard-pressed transition-all"
          >
            {t('common.save')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

/** Single setting row with icon + label on top, control below */
function SettingRow({ icon, label, children }: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-neo-cream/60">
        {icon}
        <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
      </div>
      {children}
    </div>
  );
}

/** Small selectable chip button */
function ChipButton({ active, onClick, label }: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-neo border-2 text-xs font-bold uppercase transition-all',
        active
          ? 'bg-neo-lime text-neo-black border-neo-black shadow-hard-sm'
          : 'bg-white/5 text-neo-cream/70 border-neo-white/15 hover:border-neo-white/30 hover:bg-white/10'
      )}
    >
      {label}
    </button>
  );
}

export default AdvancedSettingsModal;
