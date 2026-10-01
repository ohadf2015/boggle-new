'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import AssignmentCreator from '@/components/teacher/assignments/AssignmentCreator';

interface AssignListDialogProps {
  lessonId: string | null;
  onClose: () => void;
}

export default function AssignListDialog({ lessonId, onClose }: AssignListDialogProps) {
  const { t, language } = useLanguage();
  const { classrooms, isLoading } = useClassrooms();
  const [classroomId, setClassroomId] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId) {
      setClassroomId(null);
      return;
    }
    if (classrooms.length === 1) setClassroomId(classrooms[0].id);
  }, [lessonId, classrooms]);

  if (!lessonId || isLoading) return null;

  if (classroomId) {
    return (
      <AssignmentCreator
        classroomId={classroomId}
        isOpen
        initialLessonId={lessonId}
        onClose={onClose}
        onComplete={onClose}
      />
    );
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bg-neo-navy p-5 text-neo-white sm:max-w-md" closeButtonLabel={t('common.close')} style={{ backgroundImage: 'none' }}>
        <DialogTitle className="pe-12 font-neo-display text-xl normal-case text-neo-white">{t('eduLibrary.assign.title')}</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-neo-white/80">
          {classrooms.length === 0 ? t('eduLibrary.assign.noClasses') : t('eduLibrary.assign.pickClass')}
        </DialogDescription>
        {classrooms.length === 0 ? (
          <Link
            href={`/${language}/teacher/classroom`}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-neo border-3 border-neo-black bg-neo-lime font-neo-display font-bold uppercase text-neo-black shadow-hard"
          >
            <GraduationCap className="size-5" aria-hidden="true" />
            {t('eduLibrary.assign.createClass')}
          </Link>
        ) : (
          <div className="mt-4 grid gap-2">
            {classrooms.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setClassroomId(c.id)}
                className="flex min-h-12 items-center gap-2 rounded-neo border-2 border-neo-cream bg-neo-navy-light px-3 text-start font-bold text-neo-white shadow-hard-sm transition-all hover:-translate-y-0.5 hover:border-neo-cyan"
              >
                <GraduationCap className="size-5 shrink-0 text-neo-cyan" aria-hidden="true" />
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
