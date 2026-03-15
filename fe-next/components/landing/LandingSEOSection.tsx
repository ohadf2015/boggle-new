'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Swords, CalendarDays, Map, Sparkles, ChevronDown, Plus, Minus,
  Smartphone, BookOpen, Users, Zap,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

/* ── Animation variants ─────────────────────────────────── */

const easeOut: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

// SSR-safe: initial = visible for crawlers
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
    color: 'from-neo-pink to-pink-400',
    rotate: -2,
  },
  {
    icon: CalendarDays,
    titleKey: 'landing.seo.feature2Title',
    tagKey: 'landing.seo.modeTagDaily',
    fallbackTitle: 'Daily Challenges',
    fallbackTag: 'New puzzle daily',
    color: 'from-neo-yellow to-amber-400',
    rotate: 1.5,
  },
  {
    icon: Map,
    titleKey: 'landing.seo.feature3Title',
    tagKey: 'landing.seo.modeTagAdventure',
    fallbackTitle: 'Adventure Mode',
    fallbackTag: '100 levels',
    color: 'from-neo-lime to-lime-400',
    rotate: -1,
  },
  {
    icon: Sparkles,
    titleKey: 'landing.seo.feature4TitleShort',
    tagKey: 'landing.seo.modeTagBlast',
    fallbackTitle: 'Blast Mode',
    fallbackTag: 'Chain reactions',
    color: 'from-neo-cyan to-cyan-400',
    rotate: 2,
  },
] as const;

/* ── How to Play steps ──────────────────────────────────── */

const STEP_COLORS = ['bg-neo-pink', 'bg-neo-yellow', 'bg-neo-lime', 'bg-neo-cyan'];
const STEP_EMOJIS = ['👆', '🔤', '🔥', '🏆'];

/* ── FAQ Accordion item ─────────────────────────────────── */

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      className={cn(
        'border-3 border-neo-black rounded-neo overflow-hidden',
        'bg-neo-navy/50 dark:bg-neo-white/5',
        'transition-colors duration-200',
        open && 'shadow-hard-sm'
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
            <Minus className="w-4 h-4 text-neo-pink" />
          ) : (
            <Plus className="w-4 h-4 text-neo-lime" />
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
            <p className="px-3 sm:px-4 pb-3 sm:pb-4 text-sm text-neo-white/70 leading-relaxed">
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
  { slug: 'science-behind-word-games', key: 'blog.scienceTitle', fallback: 'The Science Behind Word Games', category: 'Science', color: 'bg-neo-lime' },
  { slug: 'why-word-games-are-addictive', key: 'blog.addictiveTitle', fallback: 'Why Word Games Are So Addictive', category: 'Psychology', color: 'bg-neo-pink' },
  { slug: 'daily-challenge-strategies', key: 'blog.strategiesTitle', fallback: 'Daily Challenge Strategies', category: 'Strategy', color: 'bg-neo-yellow' },
  { slug: 'word-games-for-brain-training', key: 'blog.brainTrainingTitle', fallback: 'Word Games for Brain Training', category: 'Brain Health', color: 'bg-neo-cyan' },
  { slug: 'best-boggle-alternatives-2026', key: 'blog.alternativesTitle', fallback: 'Best Boggle Alternatives 2026', category: 'Reviews', color: 'bg-neo-orange' },
  { slug: 'improve-word-game-skills', key: 'blog.improveTitle', fallback: 'Improve Your Word Game Skills', category: 'Strategy', color: 'bg-neo-purple' },
] as const;

/* ── Highlight pills (replaces "Who Can Play" wall of text) */

const HIGHLIGHTS = [
  { icon: Smartphone, key: 'landing.seo.highlightMobile', fallback: 'Any device, any browser', color: 'border-neo-pink' },
  { icon: Users, key: 'landing.seo.highlightAges', fallback: 'Ages 6+', color: 'border-neo-yellow' },
  { icon: BookOpen, key: 'landing.seo.highlightEdu', fallback: 'Used in classrooms', color: 'border-neo-lime' },
  { icon: Zap, key: 'landing.seo.highlightNoSignup', fallback: 'No signup needed', color: 'border-neo-cyan' },
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

      {/* ── What is LexiClash — short & punchy ────────── */}
      <motion.div
        className="mb-10 sm:mb-12 text-center"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase text-neo-white mb-3 neo-title">
          {t('landing.seo.whatIsTitle')}
        </h2>
        <p className="text-sm sm:text-base text-neo-white/75 leading-relaxed max-w-2xl mx-auto">
          {t('landing.seo.whatIsShort')}
        </p>
      </motion.div>

      {/* ── Game Modes — visual cards, not paragraphs ── */}
      <motion.div
        className="mb-10 sm:mb-12"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-lg sm:text-xl font-black uppercase text-neo-white text-center mb-5 neo-title-sm">
          {t('landing.seo.featuresTitle')}
        </h2>
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        >
          {GAME_MODES.map(({ icon: Icon, titleKey, tagKey, fallbackTitle, fallbackTag, color, rotate }) => (
            <motion.div
              key={titleKey}
              variants={staggerItem}
              whileHover={{ y: -6, rotate: 0, scale: 1.04, transition: { type: 'spring', stiffness: 400, damping: 15 } }}
              className={cn(
                'p-3 sm:p-4 rounded-neo border-3 border-neo-black shadow-hard-sm',
                'bg-gradient-to-br', color,
                'flex flex-col items-center text-center gap-2',
                'cursor-default select-none'
              )}
              style={{ transform: `rotate(${rotate}deg)` }}
            >
              <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-neo-black" aria-hidden="true" />
              <h3 className="font-black text-neo-black text-xs sm:text-sm uppercase leading-tight">
                {t(titleKey) || fallbackTitle}
              </h3>
              <span className={cn(
                'text-[10px] sm:text-xs font-bold text-neo-black/60 uppercase tracking-wider'
              )}>
                {t(tagKey) || fallbackTag}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── How to Play — horizontal step pills ─────── */}
      <motion.div
        className="mb-10 sm:mb-12"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-lg sm:text-xl font-black uppercase text-neo-white text-center mb-5 neo-title-sm">
          {t('landing.seo.howToPlayTitle')}
        </h2>
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        >
          {steps.map((step, i) => (
            <motion.div
              key={i}
              variants={staggerItem}
              className={cn(
                'flex flex-col items-center gap-2 p-3 sm:p-4',
                'rounded-neo border-3 border-neo-black shadow-hard-sm',
                STEP_COLORS[i],
                'text-center'
              )}
            >
              <span className="text-2xl" role="img" aria-hidden="true">{STEP_EMOJIS[i]}</span>
              <span className={cn(
                'w-6 h-6 flex items-center justify-center',
                'bg-neo-black text-neo-white font-black text-xs rounded-full'
              )}>
                {i + 1}
              </span>
              <span className="text-xs sm:text-sm font-bold text-neo-black leading-tight">
                {step}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── Highlight pills (replaces Who Can Play + Education) */}
      <motion.div
        className="mb-10 sm:mb-12"
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
          {HIGHLIGHTS.map(({ icon: Icon, key, fallback, color }) => (
            <motion.div
              key={key}
              variants={staggerItem}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2',
                'rounded-neo border-3 border-neo-black shadow-hard-xs',
                'bg-neo-navy', color,
                'text-neo-white font-bold text-xs sm:text-sm uppercase tracking-wide'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {t(key) || fallback}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── FAQ — Accordion ─────────────────────────── */}
      <motion.div
        className="mb-10 sm:mb-12"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-lg sm:text-xl font-black uppercase text-neo-white text-center mb-5 neo-title-sm">
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

      {/* ── Blog Links (kept as-is) ────────────────── */}
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-black uppercase text-neo-white">
            {t('landing.seo.blogTitle')}
          </h2>
          <Link
            href={`/${language}/blog`}
            className={cn(
              'text-xs sm:text-sm font-bold',
              'text-neo-cyan hover:text-neo-yellow transition-colors',
              'underline underline-offset-2'
            )}
          >
            {t('landing.seo.viewAllPosts') || 'View all posts →'}
          </Link>
        </div>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        >
          {BLOG_LINKS.map(({ slug, key, fallback, category, color }) => (
            <motion.div key={slug} variants={staggerItem}>
              <Link
                href={`/${language}/blog/${slug}`}
                className={cn(
                  'group block p-3 rounded-neo border-2 border-neo-black/20 dark:border-neo-white/20',
                  'bg-neo-navy/5 dark:bg-neo-white/5',
                  'hover:border-neo-cyan/60 hover:bg-neo-cyan/10 hover:-translate-y-0.5',
                  'transition-all duration-200'
                )}
              >
                <span className={cn(
                  'inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded-neo border border-neo-black text-neo-black mb-2',
                  color
                )}>
                  {category}
                </span>
                <p className="text-sm font-bold text-neo-black dark:text-neo-white group-hover:text-neo-cyan transition-colors line-clamp-2">
                  {t(key) || fallback}
                </p>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
