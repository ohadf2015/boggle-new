'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Swords, CalendarDays, Map, Sparkles, ChevronDown, Plus, Minus,
  Smartphone, BookOpen, Users, Zap, MousePointerClick, Layers, Trophy, Target,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

/* ── Animation variants ─────────────────────────────────── */

const easeOut: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

const sectionReveal: Variants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: easeOut } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const staggerItem: Variants = {
  hidden: { opacity: 1, y: 0, scale: 1 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: easeOut } },
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
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ChevronDown className="w-5 h-5 text-neo-black/30 dark:text-neo-white/30" />
      </motion.div>
    </motion.div>
  );
}

/* ── Game mode cards ────────────────────────────────────── */

const GAME_MODES = [
  {
    icon: Swords,
    titleKey: 'landing.seo.feature1Title',
    tagKey: 'landing.seo.modeTagMultiplayer',
    fallbackTitle: 'Real-Time Multiplayer',
    fallbackTag: '2-20 players',
  },
  {
    icon: CalendarDays,
    titleKey: 'landing.seo.feature2Title',
    tagKey: 'landing.seo.modeTagDaily',
    fallbackTitle: 'Daily Challenges',
    fallbackTag: 'New puzzle daily',
  },
  {
    icon: Map,
    titleKey: 'landing.seo.feature3Title',
    tagKey: 'landing.seo.modeTagAdventure',
    fallbackTitle: 'Adventure Mode',
    fallbackTag: '100 levels',
  },
  {
    icon: Sparkles,
    titleKey: 'landing.seo.feature4TitleShort',
    tagKey: 'landing.seo.modeTagBlast',
    fallbackTitle: 'Blast Mode',
    fallbackTag: 'Chain reactions',
  },
] as const;

/* ── How to Play steps ──────────────────────────────────── */

const STEP_ICONS = [MousePointerClick, Layers, Target, Trophy];

/* ── FAQ Accordion item ─────────────────────────────────── */

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      className={cn(
        'border-2 border-neo-white/10 rounded-neo overflow-hidden',
        'bg-neo-white/[0.03]',
        'transition-colors duration-200',
        open && 'border-neo-white/20 shadow-hard-sm'
      )}
      variants={staggerItem}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between gap-3 p-3 sm:p-4',
          'text-start font-bold text-sm sm:text-base text-neo-white',
          'hover:bg-neo-white/5 transition-colors'
        )}
        aria-expanded={open}
      >
        <span>{question}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          {open ? (
            <Minus className="w-4 h-4 text-neo-white/40" />
          ) : (
            <Plus className="w-4 h-4 text-neo-white/40" />
          )}
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: easeOut }}
            className="overflow-hidden"
          >
            <p className="px-3 sm:px-4 pb-3 sm:pb-4 text-sm text-neo-white/60 leading-relaxed">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Blog data ──────────────────────────────────────────── */

const BLOG_LINKS = [
  { slug: 'science-behind-word-games', key: 'blog.scienceTitle', fallback: 'The Science Behind Word Games', category: 'Science', image: '/images/blog/science-brain.jpg' },
  { slug: 'why-word-games-are-addictive', key: 'blog.addictiveTitle', fallback: 'Why Word Games Are So Addictive', category: 'Psychology', image: '/images/blog/why-addictive.jpg' },
  { slug: 'daily-challenge-strategies', key: 'blog.strategiesTitle', fallback: 'Daily Challenge Strategies', category: 'Strategy', image: '/images/blog/daily-strategies.jpg' },
] as const;

/* ── Highlight pills ──────────────────────────────────── */

const HIGHLIGHTS = [
  { icon: Smartphone, key: 'landing.seo.highlightMobile', fallback: 'Any device, any browser' },
  { icon: Users, key: 'landing.seo.highlightAges', fallback: 'Ages 6+' },
  { icon: BookOpen, key: 'landing.seo.highlightEdu', fallback: 'Used in classrooms' },
  { icon: Zap, key: 'landing.seo.highlightNoSignup', fallback: 'No signup needed' },
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
    <section className={cn('w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-32 sm:pb-12 relative z-20', className)}>

      {/* ── What is LexiClash ────────── */}
      <motion.div
        className="mb-12 sm:mb-14 text-center"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase text-neo-white mb-4 neo-title">
          {t('landing.seo.whatIsTitle')}
        </h2>
        <p className="text-sm sm:text-base text-neo-white/60 leading-relaxed max-w-2xl mx-auto">
          {t('landing.seo.whatIsShort')}
        </p>
      </motion.div>

      {/* ── Game Modes ── */}
      <motion.div
        className="mb-12 sm:mb-14"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-lg sm:text-xl font-black uppercase text-neo-white text-center mb-6 neo-title-sm">
          {t('landing.seo.featuresTitle')}
        </h2>
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        >
          {GAME_MODES.map(({ icon: Icon, titleKey, tagKey, fallbackTitle, fallbackTag }) => (
            <motion.div
              key={titleKey}
              variants={staggerItem}
              whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 15 } }}
              className={cn(
                'p-4 sm:p-5 rounded-neo border-2 border-neo-white/10',
                'bg-neo-white/[0.03]',
                'hover:border-neo-white/20 hover:bg-neo-white/[0.06]',
                'flex flex-col items-center text-center gap-2.5',
                'transition-colors duration-200 cursor-default select-none'
              )}
            >
              <div className="p-2.5 bg-neo-lime/10 rounded-neo border border-neo-lime/20">
                <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-neo-lime" aria-hidden="true" />
              </div>
              <h3 className="font-black text-neo-white text-xs sm:text-sm uppercase leading-tight">
                {t(titleKey) || fallbackTitle}
              </h3>
              <span className="text-[10px] sm:text-xs font-medium text-neo-white/40 uppercase tracking-wider">
                {t(tagKey) || fallbackTag}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── How to Play ─────── */}
      <motion.div
        className="mb-12 sm:mb-14"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-lg sm:text-xl font-black uppercase text-neo-white text-center mb-6 neo-title-sm">
          {t('landing.seo.howToPlayTitle')}
        </h2>
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        >
          {steps.map((step, i) => {
            const StepIcon = STEP_ICONS[i];
            return (
              <motion.div
                key={i}
                variants={staggerItem}
                className={cn(
                  'flex flex-col items-center gap-3 p-4 sm:p-5',
                  'rounded-neo border-2 border-neo-white/10',
                  'bg-neo-white/[0.03]',
                  'text-center'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'w-6 h-6 flex items-center justify-center',
                    'bg-neo-white/10 text-neo-white font-black text-xs rounded-full'
                  )}>
                    {i + 1}
                  </span>
                </div>
                <div className="p-2 rounded-full bg-gradient-to-br from-neo-yellow via-neo-orange to-neo-pink">
                  <StepIcon className="w-5 h-5 text-neo-black" aria-hidden="true" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-neo-white/80 leading-tight">
                  {step}
                </span>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>

      {/* ── Highlight pills ── */}
      <motion.div
        className="mb-12 sm:mb-14"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <motion.div
          className="flex flex-wrap justify-center gap-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        >
          {HIGHLIGHTS.map(({ icon: Icon, key, fallback }) => (
            <motion.div
              key={key}
              variants={staggerItem}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5',
                'rounded-neo border-2 border-neo-white/10',
                'bg-neo-white/[0.03]',
                'text-neo-white/70 font-bold text-xs sm:text-sm'
              )}
            >
              <Icon className="w-4 h-4 shrink-0 text-neo-white/40" aria-hidden="true" />
              {t(key) || fallback}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── FAQ ─────────────────────────── */}
      <motion.div
        className="mb-12 sm:mb-14"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-lg sm:text-xl font-black uppercase text-neo-white text-center mb-6 neo-title-sm">
          {t('landing.seo.faqTitle')}
        </h2>
        <motion.div
          className="space-y-2 max-w-2xl mx-auto"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <FAQItem
              key={n}
              question={t(`landing.seo.faq${n}Q`) || `Question ${n}`}
              answer={t(`landing.seo.faq${n}A`) || `Answer ${n}`}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* ── Blog Links ────────────────── */}
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg sm:text-xl font-black uppercase text-neo-white">
            {t('landing.seo.blogTitle')}
          </h2>
          <Link
            href={`/${language}/blog`}
            className={cn(
              'text-xs sm:text-sm font-bold',
              'text-neo-white/40 hover:text-neo-white transition-colors',
              'underline underline-offset-2'
            )}
          >
            {t('landing.seo.viewAllPosts') || 'View all posts'}
          </Link>
        </div>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        >
          {BLOG_LINKS.map(({ slug, key, fallback, category, image }) => (
            <motion.div key={slug} variants={staggerItem}>
              <Link
                href={`/${language}/blog/${slug}`}
                className={cn(
                  'group block rounded-neo border-2 border-neo-white/10 overflow-hidden',
                  'bg-neo-white/[0.03]',
                  'hover:border-neo-white/20 hover:bg-neo-white/[0.06] hover:-translate-y-0.5',
                  'transition-all duration-200'
                )}
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <Image
                    src={image}
                    alt={fallback}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <span className="absolute top-2 start-2 inline-block px-2 py-0.5 text-[10px] font-bold uppercase text-neo-white bg-neo-black/60 rounded-neo tracking-wider">
                    {category}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold text-neo-white/80 group-hover:text-neo-white transition-colors line-clamp-2">
                    {t(key) || fallback}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
