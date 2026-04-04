'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { GraduationCap, BookOpen, Globe, Lock, Star, Puzzle, ArrowRight, Gamepad2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/auth/AuthModal';
import { EducationHeader } from '@/components/education/EducationHeader';
import { InteractiveMascot } from '@/components/ui/InteractiveMascot';
import { cn } from '@/lib/utils';
import { ClickSpark } from '@/components/education/animations/ClickSpark';

/**
 * Education Landing Page
 *
 * - Authenticated students: auto-redirect to /student dashboard
 * - Authenticated teachers: dashboard shortcut + start game button (no role cards)
 * - Unauthenticated: simplified role cards (no feature checklists, no duel teaser)
 */

const cardEntrance = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 260, damping: 24, delay: 0.3 + i * 0.15 },
  }),
};

const heroEntrance = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 260, damping: 24 },
  },
};

interface SimpleRoleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  ctaLabel: string;
  badge: string;
  stripeColor: string;
  badgeBg: string;
  iconBg: string;
  ctaBg: string;
  locked?: boolean;
  loading?: boolean;
  onClick: () => void;
  index: number;
}

function SimpleRoleCard({
  title,
  description,
  icon,
  ctaLabel,
  badge,
  stripeColor,
  badgeBg,
  iconBg,
  ctaBg,
  locked,
  loading,
  onClick,
  index,
}: SimpleRoleCardProps) {
  return (
    <AdaptiveMotion.button
      custom={index}
      variants={cardEntrance}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={loading}
      className={cn(
        'relative w-full text-start rounded-neo-lg border-neo-thick border-neo-black',
        'bg-neo-cream shadow-hard-lg overflow-hidden',
        'hover:shadow-hard-lg transition-shadow',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2',
        'disabled:opacity-60 disabled:cursor-wait',
      )}
    >
      {/* Top stripe */}
      <div className={cn('h-3', stripeColor)} />

      {/* Badge */}
      <div className="absolute top-5 end-4">
        <span className={cn(
          'px-2 py-0.5 text-xs font-black uppercase rounded-full border-2 border-neo-black',
          badgeBg,
        )}>
          {badge}
        </span>
      </div>

      <div className="p-5 sm:p-6">
        {/* Icon */}
        <div className={cn(
          'w-12 h-12 rounded-neo border-2 border-neo-black flex items-center justify-center mb-4',
          iconBg,
        )}>
          {icon}
        </div>

        {/* Title + Description */}
        <span className="block text-xl font-black uppercase text-neo-black mb-1" role="heading" aria-level={2}>{title}</span>
        <p className="text-sm text-neo-black/70 mb-4">{description}</p>

        {/* CTA button */}
        <div className={cn(
          'w-full py-2.5 rounded-neo border-2 border-neo-black text-center font-bold uppercase text-sm',
          'shadow-hard-sm',
          ctaBg,
        )}>
          <span className="flex items-center justify-center gap-2">
            {locked && <Lock className="w-4 h-4" />}
            {ctaLabel}
          </span>
        </div>
      </div>
    </AdaptiveMotion.button>
  );
}

export default function EducationPageClient() {
  const { t, language } = useLanguage();
  const { isAuthenticated, loading: authLoading, profile } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const router = useRouter();

  const userRole = profile?.user_role;
  const isTeacherRole = profile?.is_admin === true || userRole === 'teacher' || userRole === 'admin';
  const isStudentRole = userRole === 'student';
  const dashboardHref = isTeacherRole
    ? `/${language}/teacher`
    : `/${language}/student`;

  // Auto-redirect authenticated students
  useEffect(() => {
    if (isAuthenticated && isStudentRole && !authLoading) {
      router.replace(`/${language}/student`);
    }
  }, [isAuthenticated, isStudentRole, authLoading, router, language]);

  const handleTeacherClick = () => {
    if (authLoading) return;
    if (isAuthenticated) {
      router.push(`/${language}/teacher`);
    } else {
      setShowAuthModal(true);
    }
  };

  const handleStudentClick = () => {
    router.push(`/${language}/student`);
  };

  // If student is authenticated, show nothing while redirecting
  if (isAuthenticated && isStudentRole && !authLoading) {
    return null;
  }

  return (
    <div className="min-h-dvh bg-neo-navy relative">
      {/* Halftone dot pattern overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      <EducationHeader />

      <main className="relative container mx-auto px-4 py-6 sm:py-8 lg:py-10">
        <div className="max-w-3xl mx-auto">

          {/* Hero Section */}
          <AdaptiveMotion.div
            variants={heroEntrance}
            initial="hidden"
            animate="visible"
            className={cn(
              'relative rounded-neo-lg border-neo-thick border-neo-black overflow-hidden mb-8',
              'bg-gradient-to-br from-neo-navy via-neo-navy to-neo-navy-elevated',
              'shadow-hard-lg p-6 sm:p-8',
            )}
          >
            <Star className="absolute top-4 start-4 w-5 h-5 text-neo-lime/20" />
            <Puzzle className="absolute bottom-4 end-4 w-6 h-6 text-neo-cyan/15 rotate-12" />

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-neo-white uppercase tracking-tight mb-2">
                  {t('education.landing.title')}
                </h1>
                <p className="text-base sm:text-lg text-neo-white/70 font-neo-body">
                  {t('education.landing.tagline')}
                </p>
              </div>

              <AdaptiveMotion.div
                className="flex-shrink-0 hidden sm:block"
                initial={{ scale: 0, rotate: 20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.4 }}
              >
                <InteractiveMascot
                  variant="waving"
                  size="lg"
                  animated
                  enableHover
                  enableClick
                  clickAnimation="bounce"
                />
              </AdaptiveMotion.div>
            </div>
          </AdaptiveMotion.div>

          {/* Social Proof Banner */}
          <AdaptiveMotion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, type: 'spring', stiffness: 300, damping: 25 }}
            className={cn(
              'rounded-neo border-neo-thick border-neo-black bg-neo-purple/90 shadow-hard mb-8',
              'px-5 py-3 text-center -rotate-[0.5deg]',
            )}
          >
            <p className="text-sm sm:text-base font-bold text-neo-white flex items-center justify-center gap-2 flex-wrap">
              <Globe className="w-4 h-4 text-neo-lime flex-shrink-0" />
              {t('education.landing.socialProof')}
            </p>
          </AdaptiveMotion.div>

          {/* Authenticated user dashboard shortcut (students already redirected above) */}
          {isAuthenticated && !authLoading && (
            <AdaptiveMotion.div
              data-testid="auth-dashboard-shortcut"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.2 }}
              className={cn(
                'rounded-neo border-neo-thick border-neo-black overflow-hidden mb-8',
                'bg-neo-lime shadow-hard',
              )}
            >
              <div className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-neo border-2 border-neo-black bg-neo-black flex items-center justify-center flex-shrink-0">
                    {isTeacherRole ? (
                      <GraduationCap className="w-5 h-5 text-neo-lime" />
                    ) : (
                      <BookOpen className="w-5 h-5 text-neo-lime" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-neo-black uppercase tracking-tight">
                      {profile?.display_name || profile?.username || t('common.guest')}
                    </p>
                    <p className="text-xs text-neo-black/70 font-bold">
                      {isTeacherRole ? t('education.landing.roleTeacher') : t('education.landing.roleGuest')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isTeacherRole && (
                    <Link
                      href={`/${language}/education/classroom-game`}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-neo border-2 border-neo-black',
                        'bg-neo-cyan text-neo-black font-bold uppercase text-sm',
                        'shadow-hard-sm hover:shadow-hard transition-shadow',
                      )}
                    >
                      <Gamepad2 className="w-4 h-4" />
                      {t('education.landing.startGame')}
                    </Link>
                  )}
                  <Link
                    href={dashboardHref}
                    data-testid="go-to-dashboard-link"
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-neo border-2 border-neo-black',
                      'bg-neo-black text-neo-lime font-bold uppercase text-sm',
                      'shadow-hard-sm hover:shadow-hard transition-shadow',
                    )}
                  >
                    {t('education.landing.goToDashboard')}
                    <ArrowRight className="w-4 h-4 rtl:scale-x-[-1]" />
                  </Link>
                </div>
              </div>
            </AdaptiveMotion.div>
          )}

          {/* Role Selection Cards — only for unauthenticated or guest users */}
          {(!isAuthenticated || (!isTeacherRole && !isStudentRole)) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <ClickSpark colors={['#00FFFF', '#FFE135', '#FF6B35']}>
                <SimpleRoleCard
                  title={t('education.landing.teacher')}
                  description={t('education.landing.teacherDesc')}
                  icon={<GraduationCap className="w-6 h-6 text-neo-black" />}
                  ctaLabel={isAuthenticated ? t('education.landing.teacher') : t('education.landing.teacherCta')}
                  badge={t('education.landing.premium')}
                  stripeColor="bg-neo-cyan"
                  badgeBg="bg-neo-cyan text-neo-black"
                  iconBg="bg-neo-cyan/20"
                  ctaBg="bg-neo-cyan text-neo-black"
                  locked={!isAuthenticated}
                  loading={authLoading}
                  onClick={handleTeacherClick}
                  index={0}
                />
              </ClickSpark>

              <ClickSpark colors={['#FF1493', '#FFE135', '#FF6B35']}>
                <SimpleRoleCard
                  title={t('education.landing.student')}
                  description={t('education.landing.studentDesc')}
                  icon={<BookOpen className="w-6 h-6 text-neo-black" />}
                  ctaLabel={t('education.landing.studentCta')}
                  badge={t('education.landing.freeAccess')}
                  stripeColor="bg-neo-pink"
                  badgeBg="bg-neo-pink text-neo-black"
                  iconBg="bg-neo-pink/20"
                  ctaBg="bg-neo-pink text-neo-black"
                  onClick={handleStudentClick}
                  index={1}
                />
              </ClickSpark>
            </div>
          )}
        </div>
      </main>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}
