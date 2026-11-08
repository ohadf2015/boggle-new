'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { isTeacherProfile } from '@/lib/education/teacherRole';
import { educationViewerRole, educationViewerResolved } from '@/lib/navigation/eduExitTargets';
import { classroomHubHref } from '@/lib/navigation/educationBackHref';
import { PageLoader } from '@/components/ui/PageLoader';

/** The one education address: teachers land on Teacher Home, students on the Academy, guests on the education landing. */
export default function ClassroomHubClient() {
  const router = useRouter();
  const { language } = useLanguage();
  const { user, profile, loading } = useAuth();
  const role = educationViewerRole({ isTeacher: isTeacherProfile(profile), userRole: profile?.user_role, isAnonymous: user?.is_anonymous });
  const href = classroomHubHref(language, { role, resolved: educationViewerResolved({ loading, user, profile }) });

  useEffect(() => {
    if (href) router.replace(href);
  }, [href, router]);

  return (
    <div data-testid="classroom-hub" aria-busy="true" className="flex h-dvh w-full flex-1 items-center justify-center bg-neo-navy">
      <PageLoader size="lg" priority={false} />
    </div>
  );
}
