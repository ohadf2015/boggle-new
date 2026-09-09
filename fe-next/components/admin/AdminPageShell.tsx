'use client';

/**
 * AdminPageShell — the shared chrome for every /admin page.
 *
 * Two dozen admin PageClients used to hand-roll the same block: auth guard
 * (with the profile-still-loading gap that used to bounce real admins home),
 * Header, AdminSubNav, sidebar + main, AdminBottomNav. This is that block once.
 * Pages pass only their <main> children.
 */

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import Header from '@/components/Header';
import { AdminSidebar } from '@/components/admin/sidebar/AdminSidebar';
import { AdminBottomNav } from '@/components/admin/sidebar/AdminBottomNav';
import { AdminSubNav } from '@/components/admin/sidebar/AdminSubNav';

export function AdminPageShell({ children }: { children: ReactNode }) {
  const { user, profile, isAdmin, loading } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';

  // `loading` flips false when the session resolves, but `profile` is fetched
  // afterwards — during that gap `profile` is null. Don't treat a real admin
  // as non-admin (and bounce them home) before the profile has actually loaded.
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
          {children}
        </main>
      </div>
      <AdminBottomNav />
    </div>
  );
}

export default AdminPageShell;
