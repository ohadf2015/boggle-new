'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { Swords, CalendarDays, Map, Globe, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

/* ── Animation variants ─────────────────────────────────── */

const easeOut: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
const easeOutQuart: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

// SSR-safe variants: initial state is visible (opacity: 1) so crawlers
// that don't execute JS still see the content. The whileInView animation
// enhances the experience for real users without gating visibility.
const sectionReveal: Variants = {
  hidden: { opacity: 1, y: 0 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: easeOut },
  },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const staggerItem: Variants = {
  hidden: { opacity: 1, y: 0, scale: 1 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: easeOutQuart },
  },
};

const stepItem: Variants = {
  hidden: { opacity: 1, x: 0 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: easeOut },
  },
};

/* ── Scroll indicator (bouncing chevron) ────────────────── */

export function ScrollIndicator() {
  return (
    <motion.div
      className="flex flex-col items-center gap-1 py-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2, duration: 0.6 }}
    >
      <span className="text-xs font-bold uppercase tracking-wider text-neo-black/40 dark:text-neo-white/40">
        {/* Intentionally no t() — decorative scroll cue, not content */}
      </span>
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ChevronDown className="w-5 h-5 text-neo-black/30 dark:text-neo-white/30" />
      </motion.div>
    </motion.div>
  );
}

/* ── Feature data ───────────────────────────────────────── */

const FEATURES = [
  { icon: Swords, titleKey: 'landing.seo.feature1Title', descKey: 'landing.seo.feature1Desc', fallbackTitle: 'Real-Time Multiplayer', fallbackDesc: 'Compete head-to-head with 2-20 players simultaneously.', color: 'from-neo-pink to-pink-400' },
  { icon: CalendarDays, titleKey: 'landing.seo.feature2Title', descKey: 'landing.seo.feature2Desc', fallbackTitle: 'Daily Challenges', fallbackDesc: 'Same puzzle for everyone worldwide, every day.', color: 'from-neo-yellow to-amber-400' },
  { icon: Map, titleKey: 'landing.seo.feature3Title', descKey: 'landing.seo.feature3Desc', fallbackTitle: 'Adventure Mode', fallbackDesc: '100 levels across 10 themed worlds.', color: 'from-neo-lime to-lime-400' },
  { icon: Globe, titleKey: 'landing.seo.feature4Title', descKey: 'landing.seo.feature4Desc', fallbackTitle: '5 Languages', fallbackDesc: 'Play in English, Hebrew, Swedish, Japanese, or Spanish.', color: 'from-neo-cyan to-cyan-400' },
] as const;

const BLOG_LINKS = [
  { slug: 'science-behind-word-games', key: 'blog.scienceTitle', fallback: 'The Science Behind Word Games' },
  { slug: 'daily-challenge-strategies', key: 'blog.strategiesTitle', fallback: 'Daily Challenge Strategies' },
  { slug: 'improve-word-game-skills', key: 'blog.improveTitle', fallback: 'Improve Your Word Game Skills' },
] as const;

/* ── Main component ─────────────────────────────────────── */

interface LandingSEOSectionProps {
  className?: string;
}

export function LandingSEOSection({ className }: LandingSEOSectionProps) {
  const { t, language } = useLanguage();

  const steps = [
    t('landing.seo.step1'),
    t('landing.seo.step2'),
    t('landing.seo.step3'),
    t('landing.seo.step4'),
  ];

  return (
    <section className={cn("w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-32 sm:pb-12 relative z-20", className)}>

      {/* ── What is LexiClash ────────────────────────────── */}
      <motion.div
        className="mb-8 sm:mb-10"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase text-neo-black dark:text-neo-white mb-3">
          {t('landing.seo.whatIsTitle')}
        </h2>
        <p className="text-sm sm:text-base text-neo-black/80 dark:text-neo-white/80 leading-relaxed max-w-3xl">
          {t('landing.seo.whatIsContent')}
        </p>
      </motion.div>

      {/* ── Feature Highlights (staggered grid) ──────────── */}
      <motion.div
        className="mb-8 sm:mb-10"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase text-neo-black dark:text-neo-white mb-4">
          {t('landing.seo.featuresTitle')}
        </h2>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        >
          {FEATURES.map(({ icon: Icon, titleKey, descKey, fallbackTitle, fallbackDesc, color }) => (
            <motion.div
              key={titleKey}
              variants={staggerItem}
              className={cn(
                'p-4 rounded-neo border-3 border-neo-black shadow-hard-sm',
                'bg-gradient-to-br', color,
                'hover:shadow-hard hover:-translate-y-0.5 transition-all duration-200'
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className="w-6 h-6 text-neo-black shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h3 className="font-bold text-neo-black text-sm sm:text-base">{t(titleKey) || fallbackTitle}</h3>
                  <p className="text-sm text-neo-black/70 mt-1">{t(descKey) || fallbackDesc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── How to Play (staggered steps) ────────────────── */}
      <motion.div
        className="mb-8 sm:mb-10"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase text-neo-black dark:text-neo-white mb-4">
          {t('landing.seo.howToPlayTitle')}
        </h2>
        <motion.ol
          className="space-y-2 sm:space-y-3 max-w-2xl"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        >
          {steps.map((step, i) => (
            <motion.li key={i} variants={stepItem} className="flex items-center gap-3">
              <span className={cn(
                'shrink-0 w-8 h-8 flex items-center justify-center',
                'bg-neo-purple text-neo-white font-black text-sm',
                'border-2 border-neo-black rounded-neo shadow-hard-xs'
              )}>
                {i + 1}
              </span>
              <span className="text-sm sm:text-base text-neo-black/80 dark:text-neo-white/80 font-medium">
                {step}
              </span>
            </motion.li>
          ))}
        </motion.ol>
      </motion.div>

      {/* ── Who Can Play ──────────────────────────────────── */}
      <motion.div
        className="mb-8 sm:mb-10"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase text-neo-black dark:text-neo-white mb-3">
          {t('landing.seo.whoCanPlayTitle')}
        </h2>
        <p className="text-sm sm:text-base text-neo-black/80 dark:text-neo-white/80 leading-relaxed max-w-3xl">
          {t('landing.seo.whoCanPlayContent')}
        </p>
      </motion.div>

      {/* ── Game Modes Explained ──────────────────────────── */}
      <motion.div
        className="mb-8 sm:mb-10"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase text-neo-black dark:text-neo-white mb-4">
          {t('landing.seo.gameModesTitle')}
        </h2>
        <div className="space-y-3 max-w-3xl">
          {[
            { key: 'gameModesMultiplayer', fallback: 'Multiplayer Rooms — Create a private room and share the code with up to 20 friends.' },
            { key: 'gameModesSingle', fallback: 'Single Player vs. Bots — Practice your word-finding skills against AI opponents.' },
            { key: 'gameModesDaily', fallback: 'Daily Challenge — A fresh puzzle every day, identical for all players worldwide.' },
            { key: 'gameModesAdventure', fallback: 'Adventure Mode — Journey through 10 themed worlds with 100 levels.' },
          ].map(({ key, fallback }) => (
            <p key={key} className="text-sm sm:text-base text-neo-black/80 dark:text-neo-white/80 leading-relaxed">
              {t(`landing.seo.${key}`) || fallback}
            </p>
          ))}
        </div>
      </motion.div>

      {/* ── Built for Learning ────────────────────────────── */}
      <motion.div
        className="mb-8 sm:mb-10"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase text-neo-black dark:text-neo-white mb-3">
          {t('landing.seo.educationTitle')}
        </h2>
        <p className="text-sm sm:text-base text-neo-black/80 dark:text-neo-white/80 leading-relaxed max-w-3xl">
          {t('landing.seo.educationContent')}
        </p>
      </motion.div>

      {/* ── FAQ Section ───────────────────────────────────── */}
      <motion.div
        className="mb-8 sm:mb-10"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase text-neo-black dark:text-neo-white mb-4">
          {t('landing.seo.faqTitle')}
        </h2>
        <dl className="space-y-4 max-w-3xl">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n}>
              <dt className="text-sm sm:text-base font-bold text-neo-black dark:text-neo-white mb-1">
                {t(`landing.seo.faq${n}Q`) || `Question ${n}`}
              </dt>
              <dd className="text-sm sm:text-base text-neo-black/75 dark:text-neo-white/75 leading-relaxed">
                {t(`landing.seo.faq${n}A`) || `Answer ${n}`}
              </dd>
            </div>
          ))}
        </dl>
      </motion.div>

      {/* ── Community ─────────────────────────────────────── */}
      <motion.div
        className="mb-8 sm:mb-10"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-lg sm:text-xl font-black uppercase text-neo-black dark:text-neo-white mb-3">
          {t('landing.seo.communityTitle')}
        </h2>
        <p className="text-sm sm:text-base text-neo-black/80 dark:text-neo-white/80 leading-relaxed max-w-3xl">
          {t('landing.seo.communityContent')}
        </p>
      </motion.div>

      {/* ── Blog Links ───────────────────────────────────── */}
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-lg sm:text-xl font-black uppercase text-neo-black dark:text-neo-white mb-3">
          {t('landing.seo.blogTitle')}
        </h2>
        <div className="flex flex-wrap gap-2">
          {BLOG_LINKS.map(({ slug, key, fallback }) => (
            <Link
              key={slug}
              href={`/${language}/blog/${slug}`}
              className={cn(
                'px-3 py-2 text-xs sm:text-sm font-bold',
                'bg-neo-navy/10 dark:bg-neo-white/10 text-neo-black dark:text-neo-white',
                'border-2 border-neo-black/20 dark:border-neo-white/20 rounded-neo',
                'hover:bg-neo-cyan/20 hover:border-neo-cyan/40 transition-all duration-150'
              )}
            >
              {t(key) || fallback}
            </Link>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
