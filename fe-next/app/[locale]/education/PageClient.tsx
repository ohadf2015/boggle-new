'use client';

import { useState } from 'react';
import { GraduationCap, BookOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import ModeCard from '@/components/landing/ModeCard';
import AuthModal from '@/components/auth/AuthModal';
import { EducationHeader } from '@/components/education/EducationHeader';

/**
 * Education Landing Page
 *
 * Entry point for education mode with Teacher/Student role selection.
 * Teacher access requires authentication, Student access is public.
 * Uses EducationHeader to create self-contained education experience.
 */
export default function EducationPageClient() {
  const { t, language } = useLanguage();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-h-screen bg-neo-navy">
      <EducationHeader />

      {/* Reduced padding: mobile 16px, sm 24px, lg 32px (was 48px) */}
      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        <div className="max-w-2xl mx-auto">
          {/* Title */}
          {/* Reduced margin: mobile 16px, sm 24px (was 48px) */}
          <h1 className="text-4xl sm:text-5xl font-black text-neo-white text-center mb-4 sm:mb-6 uppercase tracking-tight">
            {t('education.landing.title')}
          </h1>

          {/* Role Selection Cards */}
          {/* Reduced gap: mobile 12px, sm 16px (was 24px) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Teacher Card - Requires Authentication */}
            <ModeCard
              title={t('education.landing.teacher')}
              description={t('education.landing.teacherDesc')}
              href={`/${language}/teacher`}
              icon={<GraduationCap />}
              variant="cyan"
              locked={!isAuthenticated}
              loading={authLoading}
              lockedMessage={t('education.landing.signInRequired')}
              onLockedClick={() => setShowAuthModal(true)}
            />

            {/* Student Card - Public Access */}
            <ModeCard
              title={t('education.landing.student')}
              description={t('education.landing.studentDesc')}
              href={`/${language}/student`}
              icon={<BookOpen />}
              variant="pink"
            />
          </div>
        </div>
      </main>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}
