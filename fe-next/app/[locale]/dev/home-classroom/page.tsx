'use client';

/** DEV-ONLY: every home classroom card variant from fixtures. Route: /[locale]/dev/home-classroom */

import { useLanguage } from '@/contexts/LanguageContext';
import { Frame, StudentClassView, TeacherClassView } from '@/components/home-preview/ClassroomStrip';

const CLASS = { id: 'demo', name: 'Room 12 · Ms. Levi', join_code: 'QX7K2P', member_count: 24 };

export default function HomeClassroomDevPage() {
  const { t, language } = useLanguage();
  const tt = t as (key: string, params?: Record<string, string | number>) => string;
  return (
    <div className="flex flex-col gap-10 bg-neo-navy py-10">
      <div data-dev="teacher"><TeacherClassView lang={language} t={tt} classroom={CLASS} /></div>
      <div data-dev="teacher-simple"><Frame variant="teacher-simple" lang={language} t={tt} /></div>
      <div data-dev="student"><StudentClassView lang={language} t={tt} name={CLASS.name} /></div>
      <div data-dev="pitch"><Frame variant="pitch" lang={language} t={tt} /></div>
      <div data-dev="loading"><Frame variant="loading" lang={language} t={tt} /></div>
    </div>
  );
}
