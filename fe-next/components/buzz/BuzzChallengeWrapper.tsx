'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import BuzzChallenge from './BuzzChallenge';
import type { Language } from '@/types';

/**
 * BuzzChallengeWrapper - Client wrapper for Daily Buzz page route
 * Handles navigation and search params for standalone buzz page
 */
export default function BuzzChallengeWrapper() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();

  const date = searchParams.get('date') || undefined;

  const handleBack = () => {
    router.push('/daily');
  };

  return (
    <div className="min-h-screen flex flex-col bg-neo-navy">
      <div className="flex-1">
        <BuzzChallenge
          language={language as Language}
          onBack={handleBack}
          date={date}
        />
      </div>
    </div>
  );
}
