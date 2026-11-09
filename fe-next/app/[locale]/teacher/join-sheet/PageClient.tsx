'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { JoinSheet, normalizeJoinCode } from '@/components/teacher/joinSheet/JoinSheet';

/** Printable join slips. Everything comes from the link the teacher opened: no fetch, no roster. */
export default function JoinSheetPageClient() {
  const { t, language } = useLanguage();
  const params = useSearchParams();
  // Read after mount so the QR the server renders never differs from the client's.
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  return (
    <JoinSheet
      code={normalizeJoinCode(params.get('code'))}
      className={(params.get('name') ?? '').slice(0, 60)}
      origin={origin}
      language={language}
      t={t}
    />
  );
}
