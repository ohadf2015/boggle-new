'use client';

import React, { memo } from 'react';
import { Settings, Timer, Grid3X3, Type, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';
import { cn } from '../../../lib/utils';
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

const TIMER_OPTIONS = [1, 2, 3];
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
  return (
    <Dialog>
      <DialogTrigger asChild>
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-neo border-2 border-neo-white/20 bg-white/5 text-neo-cream/70 text-xs font-bold uppercase hover:bg-white/10 hover:border-neo-white/30 transition-all"
          aria-label={t('hostView.advancedSettings')}
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('hostView.settings')}</span>
        </motion.button>
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
                  active={timerValue === val}
                  onClick={() => setTimerValue(val)}
                  label={`${val} ${t('hostView.min')}`}
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
                  active={difficulty === key}
                  onClick={() => setDifficulty(key)}
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
                  active={minWordLength === val}
                  onClick={() => setMinWordLength(val)}
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
                const active = roomLanguage === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onRoomLanguageChange(code)}
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
