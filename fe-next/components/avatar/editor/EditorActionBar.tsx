'use client';

/**
 * Bottom action bar: undo · randomize · DONE. Lives in the thumb zone and
 * closes the part grid off with a hard edge, so a row that scrolls under it
 * reads as "more below" instead of "cut off by the screen". Nothing in the
 * editor floats over the stage or the grid.
 */
import { Dices, Undo2 } from 'lucide-react';

type T = (key: string, a?: string | Record<string, string | number>, b?: Record<string, string | number>) => string;

interface EditorActionBarProps {
  canUndo: boolean;
  onUndo: () => void;
  onRandomize: () => void;
  onSave: () => void;
  t: T;
}

const ICON_BTN =
  'shrink-0 w-12 h-12 rounded-neo border-[3px] border-black flex items-center justify-center shadow-hard active:translate-x-px active:translate-y-px active:shadow-hard-sm transition-transform disabled:opacity-40 disabled:shadow-none disabled:active:translate-x-0 disabled:active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan';

export default function EditorActionBar({ canUndo, onUndo, onRandomize, onSave, t }: EditorActionBarProps) {
  return (
    <div
      data-testid="editor-actionbar"
      className="shrink-0 flex items-center gap-2.5 px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] border-t-[3px] border-black bg-neo-navy"
    >
      <button
        type="button"
        data-testid="editor-undo"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label={t('avatarBuilder.undo')}
        title={t('avatarBuilder.undo')}
        className={`${ICON_BTN} bg-neo-navy-light text-neo-white`}
      >
        <Undo2 size={20} strokeWidth={2.5} aria-hidden="true" className="rtl:-scale-x-100" />
      </button>
      <button
        type="button"
        data-testid="editor-randomize"
        onClick={onRandomize}
        aria-label={t('avatarBuilder.randomize')}
        title={t('avatarBuilder.randomize')}
        className={`${ICON_BTN} bg-neo-purple text-neo-white`}
      >
        <Dices size={22} strokeWidth={2.5} aria-hidden="true" />
      </button>
      <button
        type="button"
        data-testid="editor-save"
        onClick={onSave}
        className="flex-1 min-w-0 h-12 rounded-neo border-[3px] border-black bg-neo-lime text-neo-black font-neo-display text-lg font-bold uppercase tracking-wide shadow-hard active:translate-x-px active:translate-y-px active:shadow-hard-sm transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan truncate"
      >
        {t('avatarBuilder.save')}
      </button>
    </div>
  );
}
