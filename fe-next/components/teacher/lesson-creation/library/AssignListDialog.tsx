'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, GraduationCap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { cn } from '@/lib/utils';
import { Dialog } from '@/components/ui/dialog';
import AssignmentCreator from '@/components/teacher/assignments/AssignmentCreator';
import { NbDialogBody, NbDialogContent, NbDialogHeader } from '@/components/teacher/nb/NbDialog';
import { NB_BLOCK, NB_PRIMARY, NB_SMALL } from '@/components/teacher/nb/nbStyles';

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
      <NbDialogContent size="sm">
        <NbDialogHeader
          title={t('eduLibrary.assign.title')}
          description={classrooms.length === 0 ? t('eduLibrary.assign.noClasses') : t('eduLibrary.assign.pickClass')}
          closeLabel={t('common.close')}
        />
        <NbDialogBody className="pb-[max(1rem,env(safe-area-inset-bottom))]">
          {classrooms.length === 0 ? (
            <Link href={`/${language}/teacher/classroom`} className={cn(NB_PRIMARY, 'w-full')}>
              <GraduationCap className="size-5" aria-hidden="true" />
              {t('eduLibrary.assign.createClass')}
            </Link>
          ) : (
            <div className="grid gap-3">
              {classrooms.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setClassroomId(c.id)}
                  className={cn(NB_SMALL, NB_BLOCK.navy, 'min-h-14 w-full justify-start gap-3 px-3 text-start text-base')}
                >
                  <GraduationCap className="size-5 shrink-0 text-neo-cyan" aria-hidden="true" />
                  <span dir="auto" className="min-w-0 flex-1 truncate">{c.name}</span>
                  <ChevronRight className="size-5 shrink-0 rtl:rotate-180" aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
        </NbDialogBody>
      </NbDialogContent>
    </Dialog>
  );
}
