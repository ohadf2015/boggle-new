/**
 * Teacher Reports PageClient
 *
 * Client-side component for the teacher reports page.
 * Allows viewing class and individual student progress reports.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { StudentProgressReport } from '@/components/teacher/reports/StudentProgressReport';
import { ClassProgressReport } from '@/components/teacher/reports/ClassProgressReport';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { EducationHeader } from '@/components/education/EducationHeader';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';

/**
 * TeacherReportsInner - Teacher Reports Page
 *
 * Shows class and student progress reports with navigation between views.
 */
function TeacherReportsInner() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { classrooms, isLoading: classroomsLoading } = useClassrooms();

  // Get URL params for current view
  const classroomIdFromUrl = searchParams.get('classroomId');
  const studentIdFromUrl = searchParams.get('studentId');

  // Local state for selected IDs (allows updating without URL navigation)
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(
    classroomIdFromUrl
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    studentIdFromUrl
  );

  // Handle classroom selection
  const handleClassroomSelect = useCallback(
    (classroomId: string) => {
      setSelectedClassroomId(classroomId);
      setSelectedStudentId(null);

      // Update URL
      const params = new URLSearchParams();
      params.set('classroomId', classroomId);
      router.push(`/${language}/teacher/reports?${params.toString()}`);
    },
    [language, router]
  );

  // Handle student selection (from class report)
  const handleStudentClick = useCallback(
    (studentId: string) => {
      setSelectedStudentId(studentId);

      // Update URL
      const params = new URLSearchParams();
      if (selectedClassroomId) {
        params.set('classroomId', selectedClassroomId);
      }
      params.set('studentId', studentId);
      router.push(`/${language}/teacher/reports?${params.toString()}`);
    },
    [language, router, selectedClassroomId]
  );

  // Handle back to class view
  const handleBackToClass = useCallback(() => {
    setSelectedStudentId(null);

    // Update URL
    const params = new URLSearchParams();
    if (selectedClassroomId) {
      params.set('classroomId', selectedClassroomId);
    }
    router.push(`/${language}/teacher/reports?${params.toString()}`);
  }, [language, router, selectedClassroomId]);

  // No classroom selected - show classroom list
  if (!selectedClassroomId) {
    return (
      <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-neo-white font-neo-display mb-6">
            {t('teacher.reports.title')}
          </h1>

          <h2 className="text-lg text-neo-white/70 mb-4">
            {t('teacher.reports.selectClassroom')}
          </h2>

          {classroomsLoading ? (
            <div className="text-neo-white/70 animate-pulse">{t('teacher.reports.loadingClassrooms')}</div>
          ) : classrooms && classrooms.length > 0 ? (
            <div className="space-y-3">
              {classrooms.map((classroom) => (
                <button type="button"
                  key={classroom.id}
                  onClick={() => handleClassroomSelect(classroom.id)}
                  // The class picker IS the primary action of this screen, and
                  // it read as navy-on-navy with a black edge (~1.2:1 both
                  // ways). Cream edge + a lighter fill puts it back on the
                  // page. Width written literally — `border-neo` is merged
                  // away by cn() elsewhere and the habit costs nothing here.
                  className="w-full flex items-center justify-between p-4 bg-neo-navy-light border-[3px] border-neo-cream rounded-neo shadow-hard hover:shadow-hard-pressed hover:-translate-y-0.5 transition-all text-start"
                >
                  <span className="text-neo-white font-medium">
                    {classroom.name}
                  </span>
                  <DirectionalIcon icon={ChevronRight} className="w-5 h-5 text-neo-cyan" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-neo-white/70">{t('teacher.reports.noClassroomsFound')}</div>
          )}
      </div>
    );
  }

  // Student view
  if (selectedStudentId) {
    return (
      <div className="max-w-4xl mx-auto">
          {/* Back button */}
          <button type="button"
            onClick={handleBackToClass}
            className="inline-flex min-h-11 items-center gap-2 rounded-neo border-[2px] border-neo-cream bg-neo-navy-light px-3 py-2 text-neo-white shadow-hard-sm mb-6 transition-all hover:-translate-y-0.5 hover:shadow-hard focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan"
            aria-label={t('teacher.reports.backToClass')}
          >
            <DirectionalIcon icon={ArrowLeft} className="w-5 h-5" />
            <span>{t('teacher.reports.backToClass')}</span>
          </button>

          <StudentProgressReport
            studentId={selectedStudentId}
            classroomId={selectedClassroomId}
          />
      </div>
    );
  }

  // Class view
  return (
    <div className="max-w-4xl mx-auto">
        <ClassProgressReport
          classroomId={selectedClassroomId}
          onStudentClick={handleStudentClick}
        />
    </div>
  );
}

import { TeacherGate } from '@/components/education/TeacherGate';
import { ProGate } from '@/components/teacher/ProGate';

// Reports are a Pro surface (planMatrix: analytics/reports are what the money
// buys; last-game insights on the dashboard stay free). The gate swaps the
// whole page for the upsell — same merchandising-boundary pattern as the
// analytics dashboard.
export default function TeacherReportsPage() {
  return (
    <ReportsShell>
      <TeacherGate>
        <ProGate feature="reports">
          <TeacherReportsInner />
        </ProGate>
      </TeacherGate>
    </ReportsShell>
  );
}

/**
 * The shell wraps BOTH gates. Reports has five states a teacher can land on —
 * the role loader, the role denial, the Pro upsell, the class picker, a report —
 * and only the last two are this file's own markup. Measured live as a free
 * teacher on `/en/teacher/reports`: the upsell rendered with no shell at all and
 * `body` back to plain `.screen-fit`, i.e. the page scrolling again on the one
 * screen we sell Pro from. One shell, above everything, so all five are held.
 */
function ReportsShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <EducationShell
      header={<EducationHeader showBackButton />}
      scrollRegionLabel={t('teacher.reports.title')}
      contentClassName="p-4 sm:p-6 lg:p-8"
    >
      {children}
    </EducationShell>
  );
}
