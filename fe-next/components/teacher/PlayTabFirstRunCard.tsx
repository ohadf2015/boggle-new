'use client';

import { useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { m } from 'framer-motion';
import { BarChart3, Plus, Copy, Check } from 'lucide-react';
import { type Classroom, type Language } from '@/lib/supabase/education/types';
import toast from 'react-hot-toast';

interface PlayTabFirstRunCardProps {
  createClassroom: (name: string, language: Language) => Promise<{
    success: boolean;
    data?: Classroom;
    error?: string;
    code?: string;
    currentCount?: number;
    limit?: number | null;
  }>;
}

const fadeSlide = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

/**
 * PlayTabFirstRunCard
 *
 * Shown on the play tab when a teacher has zero classrooms (loaded state).
 * Provides an inline form to create a classroom with just a name,
 * then displays the join code inline—no tab switching, no delegation.
 *
 * Single required field (name), language defaults to teacher's interface language.
 * Closure loop: form → create → code all on this card.
 */
export default function PlayTabFirstRunCard({ createClassroom }: PlayTabFirstRunCardProps) {
  const { t, language } = useLanguage();
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdClassroom, setCreatedClassroom] = useState<Classroom | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const nameIsValid = name.trim().length > 0;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!nameIsValid) return;

      setIsLoading(true);
      setError(null);

      const result = await createClassroom(name.trim(), language as Language);

      if (result.success && result.data) {
        setCreatedClassroom(result.data);
        setName('');
      } else {
        setError(result.error || t('teacher.classroom.error.createFailed'));
      }

      setIsLoading(false);
    },
    [name, language, nameIsValid, createClassroom, t]
  );

  // Read the code out first: closing over `createdClassroom?.join_code` makes the
  // React Compiler infer the whole object as the dependency, which no longer
  // matches the declared deps and skips optimizing this component entirely.
  const joinCode = createdClassroom?.join_code;

  const handleCopyCode = useCallback(async () => {
    if (!joinCode) return;
    try {
      await navigator.clipboard.writeText(joinCode);
      setCodeCopied(true);
      toast.success(t('teacher.classroom.codeCopied'));
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      toast.error(t('teacher.classroom.error.copyFailed'));
    }
  }, [joinCode, t]);

  const handleCreateAnother = useCallback(() => {
    setCreatedClassroom(null);
    setError(null);
    setName('');
  }, []);

  // Show success state with join code
  if (createdClassroom) {
    return (
      <m.div
        variants={fadeSlide}
        initial="initial"
        animate="animate"
        exit="exit"
        className="rounded-neo border-3 border-black bg-neo-lime shadow-hard px-6 py-10 text-center"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-neo border-2 border-black bg-neo-cyan shadow-hard-sm">
          <Check className="h-8 w-8 text-black" />
        </div>
        <p className="text-black font-neo-body font-black text-lg text-balance">
          {t('teacher.classroom.created', { classroomName: createdClassroom.name })}
        </p>
        <p className="mt-2 text-sm font-bold text-black/70 text-pretty">
          {t('teacher.classroom.shareCode')}
        </p>

        {/* Join Code Display */}
        <div className="mt-6 flex items-center justify-center gap-3 rounded-neo border-2 border-black bg-neo-navy/10 px-4 py-3">
          <span
            data-selectable
            className="text-3xl font-black text-black tracking-wider font-mono"
          >
            {createdClassroom.join_code}
          </span>
          <button
            type="button"
            onClick={handleCopyCode}
            aria-label={t('teacher.classroom.copyCode')}
            className={cn(
              'p-2 rounded-neo border-2 border-black transition-all',
              codeCopied
                ? 'bg-neo-cyan text-black'
                : 'bg-neo-cream text-black hover:bg-neo-cyan shadow-hard-sm hover:shadow-hard'
            )}
          >
            {codeCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>

        <button
          type="button"
          onClick={handleCreateAnother}
          className={cn(
            'mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-neo px-6 py-2.5',
            'border-3 border-black bg-neo-cream font-neo-display font-black text-black shadow-hard',
            'hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed transition-all',
            'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan'
          )}
        >
          <Plus className="h-5 w-5" />
          {t('teacher.classroom.createAnother')}
        </button>
      </m.div>
    );
  }

  // Show form state
  return (
    <m.div
      variants={fadeSlide}
      initial="initial"
      animate="animate"
      exit="exit"
      className="rounded-neo border-3 border-black bg-neo-cream shadow-hard px-6 py-10"
    >
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-neo border-2 border-black bg-neo-lime shadow-hard-sm">
        <BarChart3 className="h-8 w-8 text-black" />
      </div>
      <p className="text-black font-neo-body font-black text-lg text-center text-balance">
        {t('teacher.dashboard.createClassroomFirst')}
      </p>
      <p className="mt-1 text-sm font-bold text-black/60 text-center text-pretty">
        {t('teacher.dashboard.reviewEmptyHint')}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {/* Name Input */}
        <div>
          <input
            type="text"
            placeholder={t('teacher.classroom.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            disabled={isLoading}
            className={cn(
              'w-full px-4 py-3 rounded-neo border-2 border-black',
              'font-neo-body font-bold text-sm',
              'bg-neo-white text-black placeholder-black/40',
              'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-neo bg-neo-red/20 border-2 border-neo-red px-4 py-2">
            <p className="text-sm font-bold text-neo-red">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!nameIsValid || isLoading}
          className={cn(
            'w-full inline-flex justify-center items-center gap-2 rounded-neo px-6 py-3',
            'border-3 border-black font-neo-display font-black text-black shadow-hard',
            'transition-all',
            nameIsValid && !isLoading
              ? 'bg-neo-cyan hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime cursor-pointer'
              : 'bg-black/20 cursor-not-allowed opacity-50'
          )}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              {t('teacher.classroom.creating')}
            </>
          ) : (
            <>
              <Plus className="h-5 w-5" />
              {t('teacher.classroom.create')}
            </>
          )}
        </button>
      </form>
    </m.div>
  );
}
