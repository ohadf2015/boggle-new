'use client';

import { GraduationCap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export interface AuthModalTeacherHeaderProps {
  mode: 'signin' | 'signup';
  onModeChange: (mode: 'signin' | 'signup') => void;
}

/** Teacher-worded header for the auth modal opened from education: new vs returning is the first, one-tap choice. */
export function AuthModalTeacherHeader({ mode, onModeChange }: AuthModalTeacherHeaderProps) {
  const { t } = useLanguage();
  const tab = (id: 'signup' | 'signin', label: string) => (
    <button
      type="button"
      data-testid={`auth-teacher-tab-${id}`}
      aria-pressed={mode === id}
      onClick={() => onModeChange(id)}
      className={cn(
        'min-h-11 flex-1 rounded-neo border-2 px-3 font-neo-display text-sm font-black uppercase tracking-wide transition-[background-color,box-shadow] duration-100',
        'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
        mode === id ? 'border-neo-black bg-neo-lime text-black shadow-hard-sm' : 'border-neo-cream/40 bg-neo-navy-light text-neo-white hover:border-neo-cream',
      )}
    >
      {label}
    </button>
  );
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black bg-neo-cyan text-black shadow-hard-sm">
          <GraduationCap className="size-5" strokeWidth={2.5} aria-hidden="true" />
        </span>
        <h2 id="auth-modal-title" className="font-neo-display text-xl font-black leading-tight text-white sm:text-2xl">
          {mode === 'signup' ? t('eduHq.auth.titleSignup') : t('eduHq.auth.titleSignin')}
        </h2>
      </div>
      <p className="mt-1.5 text-sm text-gray-300">{t('eduHq.auth.subtitle')}</p>
      <div role="group" aria-label={t('eduHq.auth.subtitle')} className="mt-3 flex gap-2">
        {tab('signup', t('eduHq.auth.tabSignup'))}
        {tab('signin', t('eduHq.auth.tabSignin'))}
      </div>
    </div>
  );
}

export default AuthModalTeacherHeader;
