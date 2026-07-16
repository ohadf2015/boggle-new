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
      <div className="min-h-screen bg-neo-navy p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-neo-white font-neo-display mb-6">
            {t('teacher.reports.title')}
          </h1>

          <h2 className="text-lg text-neo-gray mb-4">
            {t('teacher.reports.selectClassroom')}
          </h2>

          {classroomsLoading ? (
            <div className="text-neo-gray animate-pulse">{t('teacher.reports.loadingClassrooms')}</div>
          ) : classrooms && classrooms.length > 0 ? (
            <div className="space-y-3">
              {classrooms.map((classroom) => (
                <button type="button"
                  key={classroom.id}
                  onClick={() => handleClassroomSelect(classroom.id)}
                  className="w-full flex items-center justify-between p-4 bg-neo-navy border-neo border-black rounded-neo shadow-hard hover:shadow-hard-pressed hover:bg-neo-navy/80 transition-all text-start"
                >
                  <span className="text-neo-white font-medium">
                    {classroom.name}
                  </span>
                  <ChevronRight className="w-5 h-5 text-neo-gray rtl:rotate-180" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-neo-gray">{t('teacher.reports.noClassroomsFound')}</div>
          )}
        </div>
      </div>
    );
  }

  // Student view
  if (selectedStudentId) {
    return (
      <div className="min-h-screen bg-neo-navy p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Back button */}
          <button type="button"
            onClick={handleBackToClass}
            className="flex items-center gap-2 text-neo-gray hover:text-neo-white mb-6 transition-colors"
            aria-label={t('teacher.reports.backToClass')}
          >
            <ArrowLeft className="w-5 h-5 rtl:scale-x-[-1]" />
            <span>{t('teacher.reports.backToClass')}</span>
          </button>

          <StudentProgressReport
            studentId={selectedStudentId}
            classroomId={selectedClassroomId}
          />
        </div>
      </div>
    );
  }

  // Class view
  return (
    <div className="min-h-screen bg-neo-navy p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <ClassProgressReport
          classroomId={selectedClassroomId}
          onStudentClick={handleStudentClick}
        />
      </div>
    </div>
  );
}

import { TeacherGate } from '@/components/education/TeacherGate';

export default function TeacherReportsPage() {
  return <TeacherGate><TeacherReportsInner /></TeacherGate>;
}
