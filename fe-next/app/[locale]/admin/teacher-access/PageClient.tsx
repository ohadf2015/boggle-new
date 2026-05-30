'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import Header from '@/components/Header';
import { AdminSidebar } from '@/components/admin/sidebar/AdminSidebar';
import { AdminBottomNav } from '@/components/admin/sidebar/AdminBottomNav';
import { TeacherAccessQueue } from '@/components/admin/TeacherAccessQueue';

export function PageClient() {
  const { profile, loading } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';

  useEffect(() => {
    if (!loading && !profile?.is_admin) {
      router.replace('/');
    }
  }, [profile?.is_admin, loading, router]);

  if (!profile?.is_admin) return null;

  // Same nav shell as the other admin pages so Teacher Access is reachable on mobile
  // (bottom tab bar) and keeps sidebar context on desktop.
  return (
    <div className={cn('flex-1 flex flex-col w-full overflow-x-hidden min-h-screen bg-neo-navy text-neo-white', isRTL && 'rtl')}>
      <Header />
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
