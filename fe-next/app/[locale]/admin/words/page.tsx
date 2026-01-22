'use client';

import { DailyWordManager } from '@/components/admin/DailyWordManager';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';

export default function AdminWordsPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <div className={cn(
      'flex-1 flex flex-col',
      isDarkMode
        ? 'bg-neo-navy'
        : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    )}>
      <Header />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header with back button */}
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Button
            onClick={() => router.push(`/${language}/admin`)}
            variant="outline"
            size="sm"
            className={cn(
              'rounded-lg flex-shrink-0 min-w-[44px] min-h-[44px]',
              isDarkMode ? 'border-slate-600 text-gray-300 hover:bg-slate-700' : 'hover:bg-gray-100'
            )}
            aria-label="Back to admin dashboard"
          >
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
            <span className="hidden sm:inline ms-2">Back</span>
          </Button>

          <div className="flex-1 min-w-0">
            <h1 className={cn(
              'text-lg sm:text-2xl md:text-3xl font-bold truncate',
              isDarkMode ? 'text-white' : 'text-gray-900'
            )}>
              Word Manager
            </h1>
            <p className={cn(
              'text-xs sm:text-sm truncate',
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            )}>
              Daily challenge words
            </p>
          </div>
        </div>

        <DailyWordManager />
      </div>
    </div>
  );
}
