'use client';

import { type ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '@/contexts/LanguageContext';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { TeacherGate } from '@/components/education/TeacherGate';
import { PageLoader } from '@/components/ui/PageLoader';
import { cn } from '@/lib/utils';

interface ReadyClass {
  id: string;
  name: string;
  join_code: string;
  language: string;
}

function ClassReadyInner() {
  const { t, language } = useLanguage();
  const [room, setRoom] = useState<ReadyClass | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/education/classroom/paid-ready', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language }),
        });
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !body?.data?.join_code) {
          setError(body?.error || 'failed');
          return;
        }
        setRoom(body.data);
      } catch {
        if (!cancelled) setError('failed');
      }
    })();
    return () => { cancelled = true; };
  }, [language]);

  if (!room && !error) {
    return (
      <div className="flex h-full items-center justify-center">
        <PageLoader size="lg" text={t('education.access.class_ready_creating', 'Setting up your class…')} />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="mx-auto max-w-lg py-10 text-center text-neo-white">
        <p>{t('education.access.class_ready_error', 'Could not open a class. Try again, or go to teacher home.')}</p>
        <Link href={`/${language}/teacher`} className="mt-4 inline-block font-bold text-neo-lime underline">
          {t('education.access.class_ready_hq', 'Teacher home')}
        </Link>
      </div>
    );
  }

  const joinPath = `/${language}/join/${room.join_code}`;
  const joinUrl = origin ? `${origin}${joinPath}` : joinPath;
  const testUrl = `${joinUrl}?rehearsal=1`;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 py-6 text-center text-neo-white">
      <h1 className="font-neo-display text-3xl font-black text-neo-lime">
        {t('education.access.class_ready_title', 'Your class is ready')}
      </h1>
      <p className="text-base text-neo-cream/80">
        {t('education.access.class_ready_body', 'Share this code. Students join from their phones — no accounts.')}
      </p>
      <p className="text-xs font-bold uppercase tracking-widest text-neo-cream/60">
        {t('education.access.class_ready_code', 'Join code')}
      </p>
      <p data-testid="class-ready-code" className="font-mono text-5xl font-black tracking-[0.2em] text-neo-white">
        {room.join_code}
      </p>
      <div className="rounded-neo border-3 border-neo-black bg-white p-4" data-testid="class-ready-qr">
        <QRCodeSVG value={joinUrl} size={220} level="M" />
      </div>
      <p className="text-sm text-neo-cream/70">{t('education.access.class_ready_qr', 'Scan to join')}</p>
      <a
        href={testUrl}
        data-testid="class-ready-test"
        className="inline-flex min-h-14 w-full items-center justify-center rounded-neo border-3 border-neo-black bg-neo-lime px-4 text-center font-neo-display text-base font-black uppercase text-neo-navy shadow-hard"
      >
        {t('education.access.class_ready_test', 'Join from your phone as a test student')}
      </a>
      <p className="text-xs text-neo-cream/60">
        {t('education.access.class_ready_test_hint', 'A test join does not start your class trial.')}
      </p>
      <Link href={`/${language}/teacher`} className="text-sm font-bold text-neo-cyan underline">
        {t('education.access.class_ready_hq', 'Teacher home')}
      </Link>
    </div>
  );
}

export default function ClassReadyPageClient() {
  return (
    <ClassReadyShell>
      <TeacherGate>
        <ClassReadyInner />
      </TeacherGate>
    </ClassReadyShell>
  );
}

function ClassReadyShell({ children }: { children: ReactNode }) {
  const { t, language } = useLanguage();
  return (
    <EducationShell
      className={cn(language === 'he' && 'rtl')}
      scrollRegionLabel={t('education.access.class_ready_title', 'Your class is ready')}
      contentClassName="px-4 py-6 sm:px-6"
    >
      {children}
    </EducationShell>
  );
}
