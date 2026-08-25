/**
 * Join Classroom via Shareable Link
 *
 * Dynamic route that accepts a classroom code in the URL — this is the link
 * `ClassroomManager` builds for teachers to hand out.
 *
 * Anyone can use it, signed in or not: `JoinClassroomForm` asks a logged-out
 * student for a display name and joins them as a guest. Requiring an account
 * first (what this page used to do) put a signup wall in front of the one
 * action the link exists for.
 */

'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';
import JoinClassroomForm from '@/components/student/JoinClassroomForm';

export default function JoinWithCodePageClient() {
  const params = useParams();
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();

  // Extract code from URL params and normalize to uppercase
  const rawCode = params?.code as string;
  const code = rawCode?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || '';

  useEffect(() => {
    if (loading) return;
    // Not signed in: keep the code so a student who picks "sign in" over a guest
    // session lands back on this page afterwards (useAuthInitialization reads
    // this key on SIGNED_IN). No redirect — the form below handles guests.
    if (!isAuthenticated && typeof window !== 'undefined' && code) {
      sessionStorage.setItem('joinClassroomReturnCode', code);
    }
  }, [isAuthenticated, loading, code]);

  // Wait for auth to resolve before rendering: the form branches on `user` to
  // decide whether to ask for a guest name, and rendering early would flash the
  // name field at an already-signed-in student.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neo-navy">
        <PageLoader size="lg" text={t('common.loading')} />
      </div>
    );
  }

  // Validate code format (should be 6 alphanumeric characters)
  const isValidCode = code.length === 6 && /^[A-Z0-9]+$/.test(code);

  return <JoinClassroomForm initialCode={isValidCode ? code : ''} />;
}
