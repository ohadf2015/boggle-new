'use client';

import { Shield, BookOpen, AlertTriangle, Calendar, Globe, Database, BookCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { AdminSidebar } from '@/components/admin/sidebar/AdminSidebar';
import { AdminBottomNav } from '@/components/admin/sidebar/AdminBottomNav';
import { AdminSubNav } from '@/components/admin/sidebar/AdminSubNav';
import { PageLoader } from '@/components/ui/PageLoader';
import { useAdminAuth } from '@/hooks/useAdminAuth';

/** Content hub — links to existing admin sub-pages for word management */
export default function ContentPageClient() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const { isLoading: tokenLoading } = useAdminAuth();

  const isProfileLoading = !authLoading && user && !profile;

  if (!authLoading && !isProfileLoading && (!user || !isAdmin)) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center">
        <Shield className="w-16 h-16 text-neo-lime mx-auto mb-4" />
        <Button onClick={() => router.push(`/${language}`)} variant="outline">{t('common.backToHome')}</Button>
      </div>
    );
  }

  if (authLoading || isProfileLoading || tokenLoading) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center">
        <PageLoader size="lg" text={t('common.loading')} />
      </div>
    );
  }

  const links = [
    { icon: BookOpen, label: t('admin.nav.dictionary'), path: `/${language}/admin/dictionary`, color: 'text-green-500' },
    { icon: AlertTriangle, label: t('admin.nav.invalidWords'), path: `/${language}/admin/invalid-words`, color: 'text-yellow-500' },
    { icon: BookCheck, label: t('admin.nav.milogWords'), path: `/${language}/admin/milog-words`, color: 'text-emerald-500' },
    { icon: Calendar, label: t('admin.nav.dailyChallenge'), path: `/${language}/admin/words`, color: 'text-amber-500' },
    { icon: Globe, label: t('admin.nav.wikipediaWords'), path: `/${language}/admin/wikipedia-words`, color: 'text-teal-500' },
    { icon: Database, label: t('admin.nav.wordBank'), path: `/${language}/admin/word-bank`, color: 'text-indigo-500' },
  ];

  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden min-h-screen', isRTL && 'rtl')}>
      <Header />
      <AdminSubNav />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8 pb-20 sm:pb-6">
          <h1 className="text-2xl font-neo-display text-neo-white mb-6">{t('admin.sidebar.content')}</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <button type="button"
                  key={link.path}
                  onClick={() => router.push(link.path)}
                  className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 flex items-center gap-3 hover:bg-neo-navy-elevated/50 transition-colors text-start"
                >
                  <Icon className={cn('w-6 h-6 shrink-0', link.color)} />
                  <span className="text-sm font-medium text-neo-white">{link.label}</span>
                </button>
              );
            })}
          </div>
        </main>
      </div>
      <AdminBottomNav />
    </div>
  );
}
