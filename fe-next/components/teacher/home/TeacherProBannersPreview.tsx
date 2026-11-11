'use client';

import { PaymentFailedBanner } from '@/components/teacher/PaymentFailedBanner';
import { useState, type ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { teacherTrialStatus } from '@/lib/education/trial';
import { TeacherTrialReminderBanner } from '@/components/education/TeacherTrialReminderBanner';
import { TrialUrgencyBanner } from '@/components/education/TrialUrgencyBanner';
import { TeacherTrialEndingCard } from '@/components/teacher/TeacherTrialEndingCard';
import { TeacherProTrialEndedBanner } from '@/components/teacher/TeacherProTrialEndedBanner';
import { TeacherProTrialExpiringBanner } from '@/components/teacher/TeacherProTrialExpiringBanner';
import { TeacherProTrialLifecycleBanner } from '@/components/teacher/TeacherProTrialLifecycleBanner';
import { PendingCheckoutBanner } from '@/components/teacher/PendingCheckoutBanner';
import { ProGate } from '@/components/teacher/ProGate';
import { ProInlineLock } from '@/components/teacher/pro/ProInlineLock';
import { MasteryLockedTeaser } from '@/components/teacher/reports/MasteryLockedTeaser';
import { ResultsTeacherProTrialCard } from '@/components/education/results/ResultsTeacherProTrialCard';
import { TeacherProCompareCheckoutStrip } from '@/components/education/TeacherProCompareCheckoutStrip';
import { TeacherTrialWelcome } from '@/components/teacher/TeacherTrialWelcome';

const DAY = 86_400_000;

function Slot({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <p className="font-mono text-xs text-neo-cream/60">{name}</p>
      {children}
    </section>
  );
}

/** Dev-only: every Pro ask a teacher can see on Home, on fixture dates, for visual review. */
export function TeacherProBannersPreview() {
  const { language } = useLanguage();
  const [nowMs] = useState(() => Date.now());
  const iso = (days: number) => new Date(nowMs + days * DAY).toISOString();
  const noop = () => undefined;
  return (
    <main className="min-h-dvh bg-neo-navy p-4 sm:p-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <Slot name="TeacherTrialReminderBanner (2d)">
          <TeacherTrialReminderBanner trial={teacherTrialStatus(iso(2), nowMs)} onDismiss={noop} />
        </Slot>
        <Slot name="TrialUrgencyBanner (active 5d)">
          <TrialUrgencyBanner trial={teacherTrialStatus(iso(5), nowMs)} href="#" onDismiss={noop} />
        </Slot>
        <Slot name="TrialUrgencyBanner (expired)">
          <TrialUrgencyBanner trial={teacherTrialStatus(iso(-1), nowMs)} href="#" />
        </Slot>
        <Slot name="TeacherProTrialLifecycleBanner (8d)">
          <TeacherProTrialLifecycleBanner trialExpires={iso(8)} />
        </Slot>
        <Slot name="TeacherProTrialExpiringBanner (3d)">
          <TeacherProTrialExpiringBanner trialExpires={iso(3)} onDismiss={noop} />
        </Slot>
        <Slot name="TeacherProTrialEndedBanner">
          <TeacherProTrialEndedBanner onDismiss={noop} />
        </Slot>
        <Slot name="PendingCheckoutBanner">
          <PendingCheckoutBanner />
        </Slot>
        <Slot name="ProGate reports (default)">
          <ProGate feature="reports"><p>locked content</p></ProGate>
        </Slot>
        <Slot name="ProGate analytics (arcade)">
          <ProGate feature="analytics" tone="arcade"><p>locked content</p></ProGate>
        </Slot>
        <Slot name="ProInlineLock">
          <ProInlineLock feature="pressureDials" label="Pressure dials" />
        </Slot>
        <Slot name="MasteryLockedTeaser">
          <MasteryLockedTeaser words={[]} hidden={4} />
        </Slot>
        <Slot name="ResultsTeacherProTrialCard">
          <ResultsTeacherProTrialCard language={language} />
        </Slot>
        <Slot name="TeacherProCompareCheckoutStrip">
          <TeacherProCompareCheckoutStrip locale={language} />
        </Slot>
        <Slot name="TeacherTrialWelcome">
          <TeacherTrialWelcome trialExpires={iso(14)} onReturnPage />
        </Slot>
      </div>
    </main>
  );
}

/** Dev-only: one banner on fixture dates for the real Home slot (`?banner=`). */
export function previewBanner(name: string | undefined): ReactNode {
  const iso = (days: number) => new Date(Date.now() + days * DAY).toISOString();
  if (name === 'pastDue') return <PaymentFailedBanner portalUrl="#" stillPro />;
  if (name === 'reminder') return <TeacherTrialReminderBanner trial={teacherTrialStatus(iso(2), Date.now())} onDismiss={() => undefined} />;
  if (name === 'lifecycle') return <TeacherProTrialLifecycleBanner trialExpires={iso(8)} />;
  if (name === 'trialEnding') return <TeacherTrialEndingCard trial={teacherTrialStatus(iso(3), Date.now())} />;
  if (name === 'expired') return <TrialUrgencyBanner trial={teacherTrialStatus(iso(-1), Date.now())} href="#" />;
  return null;
}
