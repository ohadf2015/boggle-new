'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { ConnectionPuzzle, GameState } from '@/lib/connections/types';

interface PuzzleCardProps {
  puzzle: ConnectionPuzzle;
  state: GameState;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  correct: 'border-neo-lime bg-neo-lime/10',
  wrong: 'border-neo-red bg-neo-red/10',
  hint: 'border-neo-yellow bg-neo-yellow/10',
  playing: 'border-neo-navy-light bg-neo-navy-light',
  finished: 'border-neo-navy-light bg-neo-navy-light',
};

export default function PuzzleCard({ puzzle, state, onInputChange, onSubmit }: PuzzleCardProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const borderStyle = STATUS_STYLES[state.status] ?? STATUS_STYLES.playing;

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSubmit();
  };

  return (
    <div
      className={`relative rounded-neo border-neo-thick ${borderStyle} p-6 transition-colors duration-200`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="flex items-center justify-center gap-4 mb-6">
        <span className="font-neo-display text-2xl text-neo-cream font-bold tracking-wider">
          {puzzle.word1}
        </span>
        <span className="text-neo-white/40 text-xl">+</span>
        <span className="text-neo-white/40 text-base font-mono">?</span>
        <span className="text-neo-white/40 text-xl">+</span>
        <span className="font-neo-display text-2xl text-neo-cream font-bold tracking-wider">
          {puzzle.word2}
        </span>
      </div>

      {state.status === 'hint' && puzzle.hint && (
        <p className="text-neo-yellow text-sm text-center mb-4 animate-neo-pop">
          💡 {puzzle.hint}
        </p>
      )}

      {state.status === 'correct' && (
        <p className="text-neo-lime text-center text-lg font-bold mb-4 animate-neo-pop">
          {t('connections.correct')} ✓
        </p>
      )}

      {(state.status === 'wrong' || state.status === 'hint') && (
        <p className="text-neo-red text-center text-sm mb-4 animate-neo-shake">
          {t('connections.wrong')}
        </p>
      )}

      <div className="flex gap-3" dir={isRTL ? 'rtl' : 'ltr'}>
        <input
          type="text"
          value={state.input}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={t('connections.placeholder')}
          disabled={state.status === 'correct' || state.status === 'finished'}
          className={[
            'flex-1 rounded-neo border-neo bg-neo-navy text-neo-white font-neo-body',
            'px-4 py-3 text-lg outline-none focus:border-neo-cyan transition-colors',
            'placeholder:text-neo-white/30 shadow-hard',
            isRTL ? 'text-right' : 'text-left',
          ].join(' ')}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <button
          onClick={onSubmit}
          disabled={!state.input.trim() || state.status === 'correct' || state.status === 'finished'}
          className={[
            'rounded-neo border-neo-thick border-neo-cyan bg-neo-cyan text-neo-navy',
            'font-neo-display font-bold px-6 py-3 shadow-hard hover:shadow-hard-pressed',
            'active:shadow-hard-pressed active:translate-y-0.5 transition-all',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          ].join(' ')}
        >
          {t('connections.submit')}
        </button>
      </div>
    </div>
  );
}
