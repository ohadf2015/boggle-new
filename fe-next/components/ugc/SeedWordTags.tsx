'use client';

import { useState, useCallback, useRef, type KeyboardEvent } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface SeedWordTagsProps {
  tags: string[];
  onAdd: (word: string) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, value: string) => void;
  disabled?: boolean;
  className?: string;
}

const TAG_SPRING = { type: 'spring' as const, stiffness: 500, damping: 25 };

/**
 * SeedWordTags — editable tag input for seed words.
 * Type a word and press Enter/comma to add. Click tag text to edit inline.
 */
export function SeedWordTags({
  tags,
  onAdd,
  onRemove,
  onUpdate,
  disabled,
  className,
}: SeedWordTagsProps) {
  const { t } = useLanguage();
  const [input, setInput] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  const commitInput = useCallback(() => {
    const words = input.split(/[,\s]+/).map(w => w.trim()).filter(Boolean);
    words.forEach(w => onAdd(w));
    setInput('');
  }, [input, onAdd]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        commitInput();
      }
      if (e.key === 'Backspace' && input === '' && tags.length > 0) {
        onRemove(tags.length - 1);
      }
    },
    [commitInput, input, tags.length, onRemove]
  );

  const startEdit = useCallback((index: number) => {
    setEditingIndex(index);
    // Focus after render
    setTimeout(() => editRef.current?.focus(), 0);
  }, []);

  const commitEdit = useCallback(
    (index: number, value: string) => {
      onUpdate(index, value);
      setEditingIndex(null);
    },
    [onUpdate]
  );

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label className="font-neo-body text-sm text-neo-white">
        {t('ugc.board.seedWords')}
      </label>

      {/* Tag container + input */}
      <div
        className={cn(
          'flex flex-wrap gap-2 items-center',
          'border-neo border-neo-white/20 bg-black/30 rounded-neo px-3 py-2.5 min-h-[52px]',
          'focus-within:border-neo-cyan focus-within:shadow-[0_0_0_1px_--theme(--color-neo-cyan/40)]',
          'transition-colors',
          disabled && 'opacity-50 pointer-events-none'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <AnimatePresence mode="popLayout">
          {tags.map((tag, i) => (
            <m.span
              key={`${tag}-${i}`}
              layout
              initial={{ scale: 0, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 12, opacity: 0 }}
              transition={TAG_SPRING}
              className={cn(
                'inline-flex items-center gap-1',
                'bg-neo-cyan/20 text-neo-cyan border-2 border-neo-cyan/40',
                'rounded-neo px-2 py-0.5 text-sm font-neo-display font-bold',
                'select-none'
              )}
            >
              {editingIndex === i ? (
                <input
                  ref={editRef}
                  defaultValue={tag}
                  className="bg-transparent text-neo-cyan outline-hidden w-16 font-neo-display font-bold text-sm"
                  onBlur={e => commitEdit(i, e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitEdit(i, e.currentTarget.value);
                    if (e.key === 'Escape') setEditingIndex(null);
                  }}
                />
              ) : (
                <span
                  className="cursor-text"
                  onClick={e => {
                    e.stopPropagation();
                    startEdit(i);
                  }}
                >
                  {tag}
                </span>
              )}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onRemove(i);
                }}
                className="text-neo-cyan/60 hover:text-neo-red transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </m.span>
          ))}
        </AnimatePresence>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (input.trim()) commitInput(); }}
          placeholder={tags.length === 0 ? (t('ugc.board.seedWordsHint') || 'Enter words to include (optional)') : ''}
          disabled={disabled}
          className={cn(
            'flex-1 min-w-[80px] bg-transparent text-neo-white',
            'font-neo-body text-sm outline-hidden',
            'placeholder:text-neo-white'
          )}
        />
      </div>

      <p className="font-neo-body text-xs text-neo-white">
        {t('ugc.board.seedWordsHelp') || 'Press Enter or comma to add words. Click a tag to edit.'}
      </p>
    </div>
  );
}
