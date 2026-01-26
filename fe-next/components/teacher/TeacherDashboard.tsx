'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/Header';
import { cn } from '@/lib/utils';
import * as Tabs from '@radix-ui/react-tabs';
import ClassroomManager from './ClassroomManager';
import LessonBuilder from './LessonBuilder';
import StudentProgressView from './StudentProgressView';

// Dynamic import for ClassProgressChart (Recharts is ~150KB)
// Chart only loads when "Progress" tab is clicked
const ClassProgressChart = dynamic(
  () => import('./ClassProgressChart'),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 bg-slate-800/50 rounded-neo border-3 border-neo-black animate-pulse" />
    )
  }
);

export default function TeacherDashboard() {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const [activeTab, setActiveTab] = useState('classrooms');

  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden', isRTL && 'rtl')}>
      <Header />

      <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex-1">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-neo-display text-neo-white mb-2">
            {t('teacher.dashboard.title')}
          </h1>
        </div>

        {/* Tab Navigation */}
        <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
          <Tabs.List
            className={cn(
              'flex gap-2 border-b-4 border-neo-black mb-6 pb-2',
              'overflow-x-auto scrollbar-hide'
            )}
          >
            <TabTrigger value="classrooms" isRTL={isRTL}>
              {t('teacher.dashboard.classrooms')}
            </TabTrigger>
            <TabTrigger value="lessons" isRTL={isRTL}>
              {t('teacher.dashboard.lessons')}
            </TabTrigger>
            <TabTrigger value="students" isRTL={isRTL}>
              {t('teacher.dashboard.students')}
            </TabTrigger>
            <TabTrigger value="progress" isRTL={isRTL}>
              {t('teacher.dashboard.progress')}
            </TabTrigger>
          </Tabs.List>

          <Tabs.Content value="classrooms" className="focus:outline-none">
            <ClassroomManager />
          </Tabs.Content>

          <Tabs.Content value="lessons" className="focus:outline-none">
            <LessonBuilder />
          </Tabs.Content>

          <Tabs.Content value="students" className="focus:outline-none">
            <StudentProgressView />
          </Tabs.Content>

          <Tabs.Content value="progress" className="focus:outline-none">
            <ClassProgressChart />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
}

// Tab trigger component with neo-brutalist styling
function TabTrigger({
  value,
  children,
  isRTL,
}: {
  value: string;
  children: React.ReactNode;
  isRTL: boolean;
}) {
  return (
    <Tabs.Trigger
      value={value}
      className={cn(
        'px-4 py-2 font-neo-body font-bold text-neo-white bg-neo-navy',
        'border-neo border-neo-black transition-all',
        'hover:bg-neo-pink hover:shadow-hard-sm',
        'data-[state=active]:bg-neo-cyan data-[state=active]:text-neo-black',
        'data-[state=active]:shadow-hard',
        'focus:outline-none focus:ring-2 focus:ring-neo-yellow',
        'whitespace-nowrap',
        isRTL && 'text-right'
      )}
    >
      {children}
    </Tabs.Trigger>
  );
}
