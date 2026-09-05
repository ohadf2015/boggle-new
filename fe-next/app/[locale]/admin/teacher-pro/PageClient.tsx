'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import Header from '@/components/Header';
import { AdminSidebar } from '@/components/admin/sidebar/AdminSidebar';
import { AdminBottomNav } from '@/components/admin/sidebar/AdminBottomNav';
import { AdminSubNav } from '@/components/admin/sidebar/AdminSubNav';
import { TeacherProGrantPanel } from '@/components/admin/TeacherProGrantPanel';

export function PageClient() {
  const { user, profile, isAdmin, loading } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';

  // Same guard as teacher-access: `loading` flips false when the session
  // resolves, but `profile` arrives afterwards. Don't bounce a real admin home
  // during that gap.
  const profileLoading = !loading && !!user && !profile;

  useEffect(() => {
    if (!loading && !profileLoading && !isAdmin) {
      router.replace(`/${language}`);
    }
  }, [isAdmin, loading, profileLoading, router, language]);

  if (loading || profileLoading || !isAdmin) return null;

  return (
    <div className={cn('flex-1 flex flex-col w-full overflow-x-hidden min-h-screen bg-neo-navy text-neo-white', isRTL && 'rtl')}>
      <Header />
      <AdminSubNav />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 min-w-0 pb-20 sm:pb-6">
          <TeacherProGrantPanel />
        </main>
      </div>
      <AdminBottomNav />
    </div>
  );
}
