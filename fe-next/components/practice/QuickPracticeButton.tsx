'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Layers, Grid3X3, List, Zap, ChevronDown, Sparkles } from 'lucide-react';
import type { PracticeType } from '@/hooks/usePracticeSession';

interface SessionCounts {
  flashcard: number;
  solo_board: number;
  word_list: number;
  warmup: number;
  matching: number;
  spelling: number;
  blitz: number;
}

interface QuickPracticeButtonProps {
  /** Callback when a practice mode is selected */
  onPractice: (mode: PracticeType) => void;
  /** Lesson ID for tracking */
  lessonId: string;
  /** Session counts for each mode (optional) */
  sessionCounts?: SessionCounts;
  /** Custom className */
  className?: string;
  /** Button size variant */
  size?: 'default' | 'lg';
}

interface ModeOption {
  type: PracticeType;
  icon: React.ReactNode;
  colorClass: string;
}

/**
 * QuickPracticeButton - One-click practice with dropdown for mode selection
 *
 * Primary click starts flashcards immediately (most common mode).
 * Dropdown arrow reveals all 4 practice modes for selection.
 */
export function QuickPracticeButton({
  onPractice,
  lessonId,
  sessionCounts,
  className,
  size = 'default',
}: QuickPracticeButtonProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const modeOptions: ModeOption[] = [
    {
      type: 'flashcard',
      icon: <Layers className="w-4 h-4" />,
      colorClass: 'text-neo-cyan',
    },
    {
      type: 'solo_board',
      icon: <Grid3X3 className="w-4 h-4" />,
      colorClass: 'text-neo-orange',
    },
    {
      type: 'word_list',
      icon: <List className="w-4 h-4" />,
      colorClass: 'text-neo-yellow',
    },
    {
      type: 'warmup',
      icon: <Zap className="w-4 h-4" />,
      colorClass: 'text-neo-pink',
    },
  ];

  const getModeLabel = (type: PracticeType): string => {
    const labels: Record<PracticeType, string> = {
      flashcard: t('education.practice.flashcards'),
      solo_board: t('education.practice.soloBoard'),
      word_list: t('education.practice.wordList'),
      warmup: t('education.practice.warmup'),
      matching: t('education.practice.matching'),
      spelling: t('education.practice.spelling'),
      blitz: t('education.practice.blitz'),
    };
    return labels[type];
  };

  const handlePrimaryClick = useCallback(() => {
    onPractice('flashcard');
  }, [onPractice]);

  const handleModeSelect = useCallback((mode: PracticeType) => {
    setIsOpen(false);
    onPractice(mode);
  }, [onPractice]);

  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div
      data-testid="quick-practice-button"
      className={cn('relative inline-flex', className)}
      ref={dropdownRef}
    >
      {/* Primary practice button */}
      <Button
        onClick={handlePrimaryClick}
        size={size}
        className={cn(
          'font-neo-display',
          'bg-neo-cyan hover:bg-neo-cyan/90 text-neo-black',
          'shadow-hard hover:shadow-hard-lg',
          'border-neo border-neo-black',
          'transition-all',
          size === 'lg' ? 'text-base px-6' : 'px-4',
          isRTL ? 'rounded-l-none rounded-r-neo' : 'rounded-r-none rounded-l-neo'
        )}
      >
        <Sparkles className="w-5 h-5 me-2" />
        {t('education.practice.quickPractice')}
      </Button>

      {/* Dropdown trigger */}
      <Button
        onClick={toggleDropdown}
        size={size}
        aria-label={t('education.practice.moreOptions')}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          'bg-neo-cyan hover:bg-neo-cyan/90 text-neo-black',
          'shadow-hard hover:shadow-hard-lg',
          'border-neo border-neo-black',
          isRTL ? 'border-r-0 rounded-r-none rounded-l-neo' : 'border-l-0 rounded-l-none rounded-r-neo',
          'px-2 transition-all'
        )}
      >
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </Button>

      {/* Dropdown menu */}
      <AdaptiveAnimatePresence>
        {isOpen && (
          <AdaptiveMotion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute top-full mt-2 z-50',
              'min-w-[200px]',
              'bg-neo-navy border-neo border-neo-black rounded-neo shadow-hard-lg',
              'overflow-hidden',
              isRTL ? 'left-0' : 'right-0'
            )}
            role="listbox"
          >
            {modeOptions.map((option) => {
              const sessionCount = sessionCounts?.[option.type] || 0;

              return (
                <button
                  key={option.type}
                  onClick={() => handleModeSelect(option.type)}
                  className={cn(
                    'w-full px-4 py-3 flex items-center gap-3',
                    'hover:bg-neo-white/10 transition-colors',
                    'text-left',
                    'focus:outline-hidden focus:bg-neo-white/10'
                  )}
                  role="option"
                  aria-selected={false}
                >
                  <span className={cn('p-1.5 rounded bg-neo-black/30', option.colorClass)}>
                    {option.icon}
                  </span>
                  <div className="flex-1">
                    <span className={cn('font-neo-body font-medium text-neo-white')}>
                      {getModeLabel(option.type)}
                    </span>
                    {sessionCount > 0 && (
                      <span className="block text-xs text-neo-white">
                        {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>
    </div>
  );
}

export default QuickPracticeButton;
