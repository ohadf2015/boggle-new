'use client';

/** DEV-ONLY: every home classroom card variant from fixtures. Route: /[locale]/dev/home-classroom */

import { useLanguage } from '@/contexts/LanguageContext';
import { Frame, StudentClassView } from '@/components/home-preview/ClassroomStrip';
import { TeacherClassEntryCard } from '@/components/education/TeacherClassEntryCard';

const CLASS = { id: 'demo', name: 'Room 12 · Ms. Levi', join_code: 'QX7K2P', member_count: 24 };

export default function HomeClassroomDevPage() {
  const { t, language } = useLanguage();
  const tt = t as (key: string, params?: Record<string, string | number>) => string;
  return (
    <div className="flex flex-col gap-10 bg-neo-navy py-10">
      <div data-dev="teacher-top" className="px-4"><TeacherClassEntryCard trial={null} previewClass={CLASS} /></div>
      <div data-dev="teacher-top-empty" className="px-4"><TeacherClassEntryCard trial={null} /></div>
      <div data-dev="student"><StudentClassView lang={language} t={tt} name={CLASS.name} /></div>
      <div data-dev="pitch"><Frame variant="pitch" lang={language} t={tt} /></div>
      <div data-dev="loading"><Frame variant="loading" lang={language} t={tt} /></div>
    </div>
  );
}
