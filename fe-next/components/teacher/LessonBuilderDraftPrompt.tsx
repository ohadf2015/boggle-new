'use client';

import { cn } from '@/lib/utils';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { NB_DIALOG_DESCRIPTION, NB_DIALOG_FOOTER, NB_DIALOG_PHONE, NB_DIALOG_TITLE, nbDialogHeaderClass } from '@/components/teacher/nb/nbDialogStyles';
import { NB_PRIMARY, NB_SECONDARY } from '@/components/teacher/nb/nbStyles';

interface LessonBuilderDraftPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: () => void;
  onDiscard: () => void;
  formattedAge: string;
  t: (key: string, fallbackOrParams?: string | Record<string, string | number>, paramsWhenFallback?: Record<string, string | number>) => string;
}

export default function LessonBuilderDraftPrompt({
  open,
  onOpenChange,
  onRestore,
  onDiscard,
  formattedAge,
  t,
}: LessonBuilderDraftPromptProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        data-testid="lesson-draft-prompt"
        className={cn(
          'flex w-[calc(100%-2rem)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-md',
          'border-[3px] border-neo-cream/50 bg-neo-navy text-neo-cream shadow-hard-xl rounded-neo-xl! sm:rounded-neo-xl!',
          NB_DIALOG_PHONE.sheet,
        )}
      >
        <div className={nbDialogHeaderClass('cyan')}>
          <div className="min-w-0 flex-1">
            <AlertDialogTitle className={NB_DIALOG_TITLE}>{t('teacher.lesson.resumeDraft')}</AlertDialogTitle>
            <AlertDialogDescription className={NB_DIALOG_DESCRIPTION}>
              {t('teacher.lesson.draftFound', { time: formattedAge })}
            </AlertDialogDescription>
          </div>
        </div>
        <div className={NB_DIALOG_FOOTER}>
          <AlertDialogPrimitive.Cancel asChild>
            <button type="button" onClick={onDiscard} className={NB_SECONDARY}>
              {t('teacher.lesson.discardDraftButton')}
            </button>
          </AlertDialogPrimitive.Cancel>
          <AlertDialogPrimitive.Action asChild>
            <button type="button" onClick={onRestore} className={NB_PRIMARY}>
              {t('teacher.lesson.resumeDraftButton')}
            </button>
          </AlertDialogPrimitive.Action>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
