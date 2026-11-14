'use client';

import React from 'react';
import { GraduationCap, School, BookOpen } from 'lucide-react';
import type { EducationBreakdown as Edu, EduCategory } from '@/lib/admin/gameLog/educationBreakdown';

const MODE_LABEL: Record<string, string> = {
  classic: 'Classic',
  'vocab-quiz': 'Vocab Quiz',
  'wheel-rush': 'Word Wheel',
  blitz: 'Blitz',
  blast: 'Blast',
  wordcraft: 'Word Craft',
  matching: 'Matching',
  'word-hunt': 'Word Hunt',
  flashcard: 'Flashcards',
  spelling: 'Spelling',
  solo_board: 'Solo Board',
  vocab_focus: 'Vocab Focus',
  other: 'Other',
};

interface Props {
  education: Edu;
  t: (key: string, fallback?: string) => string;
}

export function EducationBreakdown({ education, t }: Props) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-bold text-neo-cream">
        <GraduationCap className="h-4 w-4 text-sky-400" />
        {t('admin.todayGames.education', 'Education')}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Category testId="edu-class-games" icon={<School className="h-5 w-5 text-sky-400" />} title={t('admin.todayGames.classGames', 'Class games')} data={education.classGames} t={t} />
        <Category testId="edu-practice" icon={<BookOpen className="h-5 w-5 text-neo-purple" />} title={t('admin.todayGames.studentPractice', 'Student practice')} data={education.practice} t={t} />
      </div>
    </section>
  );
}

function Category({ testId, icon, title, data, t }: { testId: string; icon: React.ReactNode; title: string; data: EduCategory; t: Props['t'] }) {
  return (
    <div data-testid={testId} className="rounded-neo border-neo border-black bg-neo-navy-light/50 p-3">
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-xl font-neo-display leading-tight text-neo-white tabular-nums">{data.total.toLocaleString()}</span>
        <span className="text-xs text-slate-400">{title}</span>
      </div>
      {data.modes.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">{t('admin.todayGames.eduNone', 'None in this range')}</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {data.modes.map((m) => (
            <li key={m.mode} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2 py-0.5 text-xs text-slate-300">
              <span>{t(`admin.todayGames.eduMode.${m.mode}`, MODE_LABEL[m.mode] ?? m.mode)}</span>
              <b className="tabular-nums text-neo-white">{m.count}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
