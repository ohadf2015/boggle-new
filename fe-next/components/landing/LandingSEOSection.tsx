'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { type Variants } from 'framer-motion';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import {
  Swords, CalendarDays, Map, Sparkles, ChevronDown, Plus, Minus, PencilRuler,
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
    <AdaptiveMotion.div
      className="flex flex-col items-center gap-1 py-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2, duration: 0.6 }}
    >
      <AdaptiveMotion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ChevronDown className="w-5 h-5 text-neo-black/30 dark:text-neo-white/30" />
      </AdaptiveMotion.div>
    </AdaptiveMotion.div>
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
    gradient: 'from-neo-pink/20 to-neo-pink/5',
    borderHover: 'hover:border-neo-pink/40',
    iconBg: 'bg-neo-pink/15 border-neo-pink/25',
    iconColor: 'text-neo-pink',
  },
  {
    icon: CalendarDays,
    titleKey: 'landing.seo.feature2Title',
    tagKey: 'landing.seo.modeTagDaily',
    fallbackTitle: 'Daily Challenges',
    fallbackTag: 'New puzzle daily',
    gradient: 'from-neo-lime/20 to-neo-lime/5',
    borderHover: 'hover:border-neo-lime/40',
    iconBg: 'bg-neo-lime/15 border-neo-lime/25',
    iconColor: 'text-neo-lime',
  },
  {
    icon: Map,
    titleKey: 'landing.seo.feature3Title',
    tagKey: 'landing.seo.modeTagAdventure',
    fallbackTitle: 'Adventure Mode',
    fallbackTag: '100 levels',
    gradient: 'from-neo-cyan/20 to-neo-cyan/5',
    borderHover: 'hover:border-neo-cyan/40',
    iconBg: 'bg-neo-cyan/15 border-neo-cyan/25',
    iconColor: 'text-neo-cyan',
  },
  {
    icon: Sparkles,
    titleKey: 'landing.seo.feature4TitleShort',
    tagKey: 'landing.seo.modeTagBlast',
    fallbackTitle: 'Blast Mode',
    fallbackTag: 'Chain reactions',
    gradient: 'from-neo-purple/20 to-neo-purple/5',
    borderHover: 'hover:border-neo-purple/40',
    iconBg: 'bg-neo-purple/15 border-neo-purple/25',
    iconColor: 'text-neo-purple',
  },
  {
    icon: PencilRuler,
    titleKey: 'landing.seo.feature5Title',
    tagKey: 'landing.seo.modeTagCommunity',
    fallbackTitle: 'Community Boards',
    fallbackTag: 'Player-made puzzles',
    gradient: 'from-neo-lime/15 to-neo-lime/5',
    borderHover: 'hover:border-neo-lime/30',
    iconBg: 'bg-neo-lime/10 border-neo-lime/20',
    iconColor: 'text-neo-lime',
  },
] as const;

/* ── How to Play steps ──────────────────────────────────── */

const STEP_ICONS = [MousePointerClick, Layers, Target, Trophy];
const STEP_COLORS = ['text-neo-pink', 'text-neo-cyan', 'text-neo-lime', 'text-neo-purple'] as const;
const STEP_BG = ['bg-neo-pink', 'bg-neo-cyan', 'bg-neo-lime', 'bg-neo-purple'] as const;
const STEP_GLOW = ['shadow-[0_0_20px_rgba(255,20,147,0.3)]', 'shadow-[0_0_20px_rgba(0,255,255,0.3)]', 'shadow-[0_0_20px_rgba(191,255,0,0.3)]', 'shadow-[0_0_20px_rgba(139,92,246,0.3)]'] as const;

/* ── FAQ Accordion item ─────────────────────────────────── */

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <AdaptiveMotion.div
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
        <AdaptiveMotion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          {open ? (
            <Minus className="w-4 h-4 text-neo-white/60" />
          ) : (
            <Plus className="w-4 h-4 text-neo-white/60" />
          )}
        </AdaptiveMotion.span>
      </button>
      <AdaptiveAnimatePresence initial={false}>
        {open && (
          <AdaptiveMotion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: easeOut }}
            className="overflow-hidden"
          >
            <p className="px-3 sm:px-4 pb-3 sm:pb-4 text-sm text-neo-white/60 leading-relaxed">
              {answer}
            </p>
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>
    </AdaptiveMotion.div>
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
      <AdaptiveMotion.div
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
      </AdaptiveMotion.div>

      {/* ── Game Modes — colored showcase cards ── */}
      <AdaptiveMotion.div
        className="mb-14 sm:mb-16"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-xl sm:text-2xl font-black uppercase text-neo-white text-center mb-8 neo-title">
          {t('landing.seo.featuresTitle')}
        </h2>
        <AdaptiveMotion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        >
          {GAME_MODES.map(({ icon: Icon, titleKey, tagKey, fallbackTitle, fallbackTag, gradient, borderHover, iconBg, iconColor }) => (
            <AdaptiveMotion.div
              key={titleKey}
              variants={staggerItem}
              whileHover={{ y: -6, scale: 1.03, transition: { type: 'spring', stiffness: 400, damping: 15 } }}
              className={cn(
                'relative p-4 sm:p-5 rounded-neo border-2 border-neo-white/10',
                'bg-gradient-to-b', gradient,
                borderHover,
                'flex flex-col items-center text-center gap-3',
                'transition-all duration-300 cursor-default select-none',
                'overflow-hidden group'
              )}
            >
              {/* Subtle glow dot behind icon */}
              <div className={cn(
                'absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-500',
                iconColor === 'text-neo-pink' && 'bg-neo-pink',
                iconColor === 'text-neo-lime' && 'bg-neo-lime',
                iconColor === 'text-neo-cyan' && 'bg-neo-cyan',
                iconColor === 'text-neo-purple' && 'bg-neo-purple',
              )} />
              <div className={cn('relative p-3 rounded-neo border', iconBg)}>
                <Icon className={cn('w-6 h-6 sm:w-7 sm:h-7', iconColor)} aria-hidden="true" />
              </div>
              <div className="relative flex flex-col gap-1">
                <p className="font-black text-neo-white text-xs sm:text-sm uppercase leading-tight">
                  {t(titleKey) || fallbackTitle}
                </p>
                <span className="text-[10px] sm:text-xs font-semibold text-neo-white/50 uppercase tracking-widest">
                  {t(tagKey) || fallbackTag}
                </span>
              </div>
            </AdaptiveMotion.div>
          ))}
        </AdaptiveMotion.div>
      </AdaptiveMotion.div>

      {/* ── How to Play — connected timeline flow ─────── */}
      <AdaptiveMotion.div
        className="mb-14 sm:mb-16"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-xl sm:text-2xl font-black uppercase text-neo-white text-center mb-10 neo-title">
          {t('landing.seo.howToPlayTitle')}
        </h2>
        <AdaptiveMotion.div
          className="relative grid grid-cols-2 sm:grid-cols-4 gap-y-8 gap-x-4 sm:gap-x-2"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        >
          {/* Connecting line — desktop only */}
          <div className="hidden sm:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-neo-pink/40 via-neo-cyan/40 via-50% to-neo-purple/40" aria-hidden="true" />

          {steps.map((step, i) => {
            const StepIcon = STEP_ICONS[i];
            const color = STEP_COLORS[i];
            const bg = STEP_BG[i];
            const glow = STEP_GLOW[i];
            return (
              <AdaptiveMotion.div
                key={i}
                variants={staggerItem}
                className="flex flex-col items-center text-center gap-3 relative"
              >
                {/* Large numbered badge with glow */}
                <div className={cn(
                  'relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-full',
                  'flex items-center justify-center',
                  'border-3 border-neo-black',
                  bg, glow,
                  'transition-shadow duration-300'
                )}>
                  <span className="font-black text-neo-black text-xl sm:text-2xl">{i + 1}</span>
                </div>
                {/* Icon below badge */}
                <div className={cn('p-2', color)}>
                  <StepIcon className="w-5 h-5" aria-hidden="true" />
                </div>
                {/* Step text */}
                <span className="text-xs sm:text-sm font-bold text-neo-white/80 leading-tight max-w-[140px]">
                  {step}
                </span>
              </AdaptiveMotion.div>
            );
          })}
        </AdaptiveMotion.div>
      </AdaptiveMotion.div>

      {/* ── Highlight pills ── */}
      <AdaptiveMotion.div
        className="mb-12 sm:mb-14"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <AdaptiveMotion.div
          className="flex flex-wrap justify-center gap-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        >
          {HIGHLIGHTS.map(({ icon: Icon, key, fallback }) => (
            <AdaptiveMotion.div
              key={key}
              variants={staggerItem}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5',
                'rounded-neo border-2 border-neo-white/10',
                'bg-neo-white/[0.03]',
                'text-neo-white/70 font-bold text-xs sm:text-sm'
              )}
            >
              <Icon className="w-4 h-4 shrink-0 text-neo-white/60" aria-hidden="true" />
              {t(key) || fallback}
            </AdaptiveMotion.div>
          ))}
        </AdaptiveMotion.div>
      </AdaptiveMotion.div>

      {/* ── FAQ ─────────────────────────── */}
      <AdaptiveMotion.div
        className="mb-12 sm:mb-14"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-lg sm:text-xl font-black uppercase text-neo-white text-center mb-6 neo-title-sm">
          {t('landing.seo.faqTitle')}
        </h2>
        <AdaptiveMotion.div
          className="space-y-2 max-w-2xl mx-auto"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <FAQItem
              key={n}
              question={t(`landing.seo.faq${n}Q`) || `Question ${n}`}
              answer={t(`landing.seo.faq${n}A`) || `Answer ${n}`}
            />
          ))}
        </AdaptiveMotion.div>
      </AdaptiveMotion.div>

      {/* ── Blog Links ────────────────── */}
      <AdaptiveMotion.div
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
              'text-neo-white/60 hover:text-neo-white transition-colors',
              'underline underline-offset-2'
            )}
          >
            {t('landing.seo.viewAllPosts') || 'View all posts'}
          </Link>
        </div>
        <AdaptiveMotion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        >
          {BLOG_LINKS.map(({ slug, key, fallback, category, image }) => (
            <AdaptiveMotion.div key={slug} variants={staggerItem}>
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
            </AdaptiveMotion.div>
          ))}
        </AdaptiveMotion.div>
      </AdaptiveMotion.div>
    </section>
  );
}
