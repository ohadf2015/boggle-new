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
import { NeoLoader } from '@/components/ui/NeoLoader';
import JoinClassroomForm from '@/components/student/JoinClassroomForm';

export default function StudentJoinPage() {
  const { isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated) {
      router.push(`/${language}`);
      return;
    }

    setIsChecking(false);
  }, [isAuthenticated, router, language]);

  // Show loader during auth check to prevent flash
  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neo-navy">
        <NeoLoader variant="mascot-letters" size="lg" text={t('common.loading')} />
      </div>
    );
  }

  // Don't render if not authenticated (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  return <JoinClassroomForm />;
}
