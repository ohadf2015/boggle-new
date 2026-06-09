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
import { TeacherAccessQueue } from '@/components/admin/TeacherAccessQueue';

export function PageClient() {
  const { user, profile, isAdmin, loading } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';

  // `loading` flips false when the session resolves, but `profile` is fetched
  // afterwards — during that gap `profile` is null. Don't treat a real admin as
  // non-admin (and bounce them home) before the profile has actually loaded.
  const profileLoading = !loading && !!user && !profile;

  useEffect(() => {
    if (!loading && !profileLoading && !isAdmin) {
      router.replace('/');
    }
  }, [isAdmin, loading, profileLoading, router]);

  if (loading || profileLoading || !isAdmin) return null;

  // Same nav shell as the other admin pages so Teacher Access is reachable on mobile
  // (bottom tab bar) and keeps sidebar context on desktop.
  return (
    <div className={cn('flex-1 flex flex-col w-full overflow-x-hidden min-h-screen bg-neo-navy text-neo-white', isRTL && 'rtl')}>
      <Header />
      <AdminSubNav />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 min-w-0 pb-20 sm:pb-6">
          <TeacherAccessQueue />
        </main>
      </div>
      <AdminBottomNav />
    </div>
  );
}
