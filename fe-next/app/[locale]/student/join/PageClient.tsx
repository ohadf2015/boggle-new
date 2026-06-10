/**
 * Student Join Classroom Page
 *
 * Allows students to join a teacher's classroom using a 6-character code.
 * No account required: logged-out students join as an anonymous guest by
 * entering a name (the form handles both signed-in and guest paths). We only
 * wait for auth to finish loading so a returning student's session is restored
 * before deciding what the form shows.
 */

'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';
import JoinClassroomForm from '@/components/student/JoinClassroomForm';

export default function StudentJoinPageClient() {
  const { loading } = useAuth();
  const { t } = useLanguage();

  // Wait for session restore (a returning guest's persisted anon session) before
  // rendering, so we don't briefly show the guest name field to an already
  // signed-in student.
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-neo-navy">
        <PageLoader size="lg" text={t('common.loading')} />
      </div>
    );
  }

  return <JoinClassroomForm />;
}
