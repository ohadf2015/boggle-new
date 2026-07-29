/**
 * Join Classroom via Shareable Link
 *
 * Dynamic route that accepts a classroom code in the URL.
 * Pre-fills the join form with the code from the URL.
 * Redirects unauthenticated users to sign in first.
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';
import JoinClassroomForm from '@/components/student/JoinClassroomForm';

export default function JoinWithCodePageClient() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const { t, language } = useLanguage();
  const [isChecking, setIsChecking] = useState(true);

  // Extract code from URL params and normalize to uppercase
  const rawCode = params?.code as string;
  const code = rawCode?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || '';

  useEffect(() => {
    // Wait for auth to finish loading before checking authentication
    if (loading) {
      return; // Still loading, don't make any decisions yet
    }

    // Check authentication (only after loading completes)
    if (!isAuthenticated) {
      // Store return URL so user can come back after login
      if (typeof window !== 'undefined' && code) {
        sessionStorage.setItem('joinClassroomReturnCode', code);
      }
      router.push(`/${language}`);
      return;
    }

    setIsChecking(false);
  }, [isAuthenticated, loading, router, language, code]);

  // Show loader during auth check or while auth is loading
  if (isChecking || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neo-navy">
        <PageLoader size="lg" text={t('common.loading')} />
      </div>
    );
  }

  // Don't render if not authenticated (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  // Validate code format (should be 6 alphanumeric characters)
  const isValidCode = code.length === 6 && /^[A-Z0-9]+$/.test(code);

  return <JoinClassroomForm initialCode={isValidCode ? code : ''} />;
}
