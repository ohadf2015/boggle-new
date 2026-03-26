'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, CheckCircle, Globe, Lock, Star, Puzzle, Swords, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/auth/AuthModal';
import { EducationHeader } from '@/components/education/EducationHeader';
import { InteractiveMascot } from '@/components/ui/InteractiveMascot';
import { cn } from '@/lib/utils';
import { ClickSpark } from '@/components/education/animations/ClickSpark';
import { WobbleJellyCard } from '@/components/education/animations/WobbleJellyCard';

/**
 * Education Landing Page - Clean Hero Edition
 *
 * Hero section with mascot, enhanced role cards with feature checklists,
 * social proof banner, and halftone background.
 * Teacher access requires authentication, Student access is public.
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

interface RoleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
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

function RoleCard({
  title,
  description,
  icon,
  features,
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
}: RoleCardProps) {
  return (
    <motion.button
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
        <h2 className="text-xl font-black uppercase text-neo-black mb-1">{title}</h2>
        <p className="text-sm text-neo-black/70 mb-4">{description}</p>

        {/* Feature checklist */}
        <ul className="space-y-2 mb-5">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-neo-black/80">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

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
    </motion.button>
  );
}

interface DuelTeaserCardProps {
  onDuelClick: () => void;
}

function DuelTeaserCard({ onDuelClick }: DuelTeaserCardProps) {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.55 }}
      className={cn(
        'relative rounded-neo-lg border-neo-thick border-neo-black overflow-hidden mt-6',
        'bg-neo-orange shadow-hard-lg',
      )}
    >
      {/* Top stripe */}
      <div className="h-2 bg-neo-pink" />

      <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Icon */}
        <div className="w-12 h-12 rounded-neo border-2 border-neo-black bg-neo-pink/30 flex items-center justify-center flex-shrink-0">
          <Swords className="w-6 h-6 text-neo-black" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg sm:text-xl font-black uppercase text-neo-black mb-0.5">
            {t('education.landing.duelTeaser.headline')}
          </h3>
          <p className="text-sm text-neo-black/75">
            {t('education.landing.duelTeaser.subtext')}
          </p>
        </div>

        {/* CTA */}
        <WobbleJellyCard className="flex-shrink-0">
          <button
            onClick={onDuelClick}
            className={cn(
              'px-5 py-2.5 rounded-neo border-2 border-neo-black',
              'bg-neo-black text-neo-white font-bold uppercase text-sm',
              'shadow-hard-sm hover:shadow-hard transition-shadow',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2',
            )}
          >
            {t('education.landing.duelTeaser.cta')}
          </button>
        </WobbleJellyCard>
      </div>
    </motion.div>
  );
}

export default function EducationPageClient() {
  const { t, language } = useLanguage();
  const { isAuthenticated, loading: authLoading, profile } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const router = useRouter();

  // Determine the user's role for dashboard shortcut
  const userRole = profile?.user_role;
  const isTeacherRole = profile?.is_admin === true || userRole === 'teacher' || userRole === 'admin';
  const isStudentRole = userRole === 'student';
  const dashboardHref = isTeacherRole
    ? `/${language}/teacher`
    : `/${language}/student`;

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

  const handleDuelClick = () => {
    router.push(`/${language}/education/duels`);
  };

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
          <motion.div
            variants={heroEntrance}
            initial="hidden"
            animate="visible"
            className={cn(
              'relative rounded-neo-lg border-neo-thick border-neo-black overflow-hidden mb-8',
              'bg-gradient-to-br from-neo-navy via-neo-navy to-neo-navy-elevated',
              'shadow-hard-lg p-6 sm:p-8',
            )}
          >
            {/* Decorative corner elements */}
            <Star className="absolute top-4 start-4 w-5 h-5 text-neo-yellow/20" />
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

              {/* Mascot */}
              <motion.div
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
              </motion.div>
            </div>
          </motion.div>

          {/* Social Proof Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, type: 'spring', stiffness: 300, damping: 25 }}
            className={cn(
              'rounded-neo border-neo-thick border-neo-black bg-neo-purple/90 shadow-hard mb-8',
              'px-5 py-3 text-center -rotate-[0.5deg]',
            )}
          >
            <p className="text-sm sm:text-base font-bold text-neo-white flex items-center justify-center gap-2 flex-wrap">
              <Globe className="w-4 h-4 text-neo-yellow flex-shrink-0" />
              {t('education.landing.socialProof')}
            </p>
          </motion.div>

          {/* Authenticated User Dashboard Shortcut */}
          {isAuthenticated && !authLoading && (
            <motion.div
              data-testid="auth-dashboard-shortcut"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.2 }}
              className={cn(
                'rounded-neo border-neo-thick border-neo-black overflow-hidden mb-8',
                'bg-neo-yellow shadow-hard',
              )}
            >
              <div className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-neo border-2 border-neo-black bg-neo-black flex items-center justify-center flex-shrink-0">
                    {isTeacherRole ? (
                      <GraduationCap className="w-5 h-5 text-neo-yellow" />
                    ) : (
                      <BookOpen className="w-5 h-5 text-neo-yellow" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-neo-black uppercase tracking-tight">
                      {profile?.display_name || profile?.username || t('common.guest')}
                    </p>
                    <p className="text-xs text-neo-black/70 font-bold">
                      {isTeacherRole
                        ? t('education.landing.roleTeacher')
                        : isStudentRole
                          ? t('education.landing.roleStudent')
                          : t('education.landing.roleGuest')}
                    </p>
                  </div>
                </div>
                <Link
                  href={dashboardHref}
                  data-testid="go-to-dashboard-link"
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-neo border-2 border-neo-black',
                    'bg-neo-black text-neo-yellow font-bold uppercase text-sm flex-shrink-0',
                    'shadow-hard-sm hover:shadow-hard transition-shadow',
                  )}
                >
                  {t('education.landing.goToDashboard')}
                  <ArrowRight className="w-4 h-4 rtl:scale-x-[-1]" />
                </Link>
              </div>
            </motion.div>
          )}

          {/* Role Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Teacher Card */}
            <ClickSpark colors={['#00FFFF', '#FFE135', '#FF6B35']}>
              <RoleCard
                title={t('education.landing.teacher')}
                description={t('education.landing.teacherDesc')}
                icon={<GraduationCap className="w-6 h-6 text-neo-black" />}
                features={[
                  t('education.landing.teacherFeature1'),
                  t('education.landing.teacherFeature2'),
                  t('education.landing.teacherFeature3'),
                ]}
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

            {/* Student Card */}
            <ClickSpark colors={['#FF1493', '#FFE135', '#FF6B35']}>
              <RoleCard
                title={t('education.landing.student')}
                description={t('education.landing.studentDesc')}
                icon={<BookOpen className="w-6 h-6 text-neo-black" />}
                features={[
                  t('education.landing.studentFeature1'),
                  t('education.landing.studentFeature2'),
                  t('education.landing.studentFeature3'),
                ]}
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

          {/* Duel Teaser — surface duels feature for students */}
          <DuelTeaserCard onDuelClick={handleDuelClick} />
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
