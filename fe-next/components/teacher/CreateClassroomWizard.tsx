'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

const STEPS = [
  { n: '1', color: 'bg-neo-cyan', titleKey: 'teacher.classroom.wizard.step1.title', titleFallback: 'Create class', bodyKey: 'teacher.classroom.wizard.step1.body', bodyFallback: 'Name it and pick a language.' },
  { n: '2', color: 'bg-neo-lime', titleKey: 'teacher.classroom.wizard.step2.title', titleFallback: 'Get code', bodyKey: 'teacher.classroom.wizard.step2.body', bodyFallback: 'A short join code appears instantly.' },
  { n: '3', color: 'bg-neo-pink', titleKey: 'teacher.classroom.wizard.step3.title', titleFallback: 'Share with students', bodyKey: 'teacher.classroom.wizard.step3.body', bodyFallback: 'Send the code. No student logins needed.' },
] as const;

interface CreateClassroomWizardProps {
  onCreateClassroom: () => void;
  createButtonTestId?: string;
  className?: string;
}

/**
 * Shared 3-step empty-state wizard: Create class → Get code → Share with students.
 * Used by PlayTabFirstRunCard and ClassroomManager.
 */
export default function CreateClassroomWizard({
  onCreateClassroom,
  createButtonTestId,
  className,
}: CreateClassroomWizardProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';

  return (
    <div
      data-testid="create-classroom-wizard"
      dir={isRTL ? 'rtl' : 'ltr'}
      className={cn(
        'rounded-neo border-3 border-black bg-neo-cream shadow-hard px-5 py-8 sm:px-8',
        className
      )}
    >
      <div className="text-center mb-6">
        <h3 className="text-xl sm:text-2xl font-neo-display font-black text-black text-balance">
          {t('teacher.classroom.wizard.title', 'Get students in 3 steps')}
        </h3>
        <p className="mt-1 text-sm font-neo-body font-bold text-black/60 text-pretty">
          {t('teacher.classroom.wizard.subtitle', "You'll have a join code in under a minute.")}
        </p>
      </div>

      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {STEPS.map((step) => (
          <li
            key={step.n}
            className="flex sm:flex-col items-start sm:items-center gap-3 sm:gap-2 sm:text-center"
          >
            <span
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-neo border-3 border-black',
                'font-neo-display font-black text-black shadow-hard-sm tabular-nums',
                step.color
              )}
              aria-hidden="true"
            >
              {step.n}
            </span>
            <div>
              <p className="font-neo-display font-black text-black text-balance">
                {t(step.titleKey, step.titleFallback)}
              </p>
              <p className="mt-0.5 text-sm font-neo-body font-bold text-black/60 text-pretty">
                {t(step.bodyKey, step.bodyFallback)}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex justify-center">
        <button
          type="button"
          data-testid={createButtonTestId}
          onClick={onCreateClassroom}
          className={cn(
            'inline-flex min-h-[44px] items-center gap-2 rounded-neo px-6 py-2.5',
            'border-3 border-black bg-neo-cyan font-neo-display font-black text-black shadow-hard',
            'hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed transition-all',
            'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime'
          )}
        >
          <Plus className="size-5" aria-hidden="true" />
          {t('teacher.classroom.create', 'Create Classroom')}
        </button>
      </div>
    </div>
  );
}
