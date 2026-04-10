'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';

/**
 * DailyRedirect - Always redirects to word hunt (the only daily challenge).
 * The /daily route is kept for OG metadata on share links.
 */
export default function DailyRedirect() {
  const { language } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/${language}/daily/word-hunt`);
  }, [language, router]);

  return (
    <div className="flex-1 flex items-center justify-center bg-neo-navy">
      <PageLoader size="lg" />
    </div>
  );
}
