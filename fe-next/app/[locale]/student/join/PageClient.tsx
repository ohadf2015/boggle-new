/**
 * Student Join Classroom Page
 *
 * Allows students to join a teacher's classroom using a 6-character code.
 * Requires authentication - redirects to home if not signed in.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';
import JoinClassroomForm from '@/components/student/JoinClassroomForm';

export default function StudentJoinPageClient() {
  const { isAuthenticated, loading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading before checking authentication
    if (loading) {
      return; // Still loading, don't make any decisions yet
    }

    // Check authentication (only after loading completes)
    if (!isAuthenticated) {
      router.push(`/${language}`);
      return;
    }

    setIsChecking(false);
  }, [isAuthenticated, loading, router, language]);

  // Show loader during auth check or while auth is loading
  if (isChecking || loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-neo-navy">
        <PageLoader size="lg" text={t('common.loading')} />
      </div>
    );
  }

  // Don't render if not authenticated (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  return <JoinClassroomForm />;
}
