'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { type Variants } from 'framer-motion';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import {
  Swords, CalendarDays, Map, Sparkles, ChevronDown, Plus, Minus, PencilRuler,
  Smartphone, BookOpen, Users, Zap, MousePointerClick, Layers, Trophy, Target,
  GraduationCap, Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { contentByLocale, type LandingSEOContent } from './landingSEOContent';

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

/* ── Game mode card config ─────────────────────────────── */

const MODE_ICONS = [Swords, CalendarDays, Map, Sparkles, PencilRuler] as const;
const MODE_STYLES = [
  { gradient: 'from-neo-pink/20 to-neo-pink/5', borderHover: 'hover:border-neo-pink/40', iconBg: 'bg-neo-pink/15 border-neo-pink/25', iconColor: 'text-neo-pink', glowBg: 'bg-neo-pink' },
  { gradient: 'from-neo-lime/20 to-neo-lime/5', borderHover: 'hover:border-neo-lime/40', iconBg: 'bg-neo-lime/15 border-neo-lime/25', iconColor: 'text-neo-lime', glowBg: 'bg-neo-lime' },
  { gradient: 'from-neo-cyan/20 to-neo-cyan/5', borderHover: 'hover:border-neo-cyan/40', iconBg: 'bg-neo-cyan/15 border-neo-cyan/25', iconColor: 'text-neo-cyan', glowBg: 'bg-neo-cyan' },
  { gradient: 'from-neo-purple/20 to-neo-purple/5', borderHover: 'hover:border-neo-purple/40', iconBg: 'bg-neo-purple/15 border-neo-purple/25', iconColor: 'text-neo-purple', glowBg: 'bg-neo-purple' },
  { gradient: 'from-neo-lime/15 to-neo-lime/5', borderHover: 'hover:border-neo-lime/30', iconBg: 'bg-neo-lime/10 border-neo-lime/20', iconColor: 'text-neo-lime', glowBg: 'bg-neo-lime' },
] as const;

/* ── How to Play steps ──────────────────────────────────── */

const STEP_ICONS = [MousePointerClick, Layers, Target, Trophy];
const STEP_COLORS = ['text-neo-pink', 'text-neo-cyan', 'text-neo-lime', 'text-neo-purple'] as const;
const STEP_BG = ['bg-neo-pink', 'bg-neo-cyan', 'bg-neo-lime', 'bg-neo-purple'] as const;
const STEP_GLOW = [
  'shadow-[0_0_20px_rgba(255,20,147,0.3)]',
  'shadow-[0_0_20px_rgba(0,255,255,0.3)]',
  'shadow-[0_0_20px_rgba(191,255,0,0.3)]',
  'shadow-[0_0_20px_rgba(139,92,246,0.3)]',
] as const;

/* ── Highlight pill icons ──────────────────────────────── */

const HIGHLIGHT_ICONS = [Smartphone, Users, BookOpen, Zap];

/* ── Blog images ───────────────────────────────────────── */

const BLOG_IMAGES = [
  '/images/blog/science-brain.jpg',
  '/images/blog/why-addictive.jpg',
  '/images/blog/daily-strategies.jpg',
] as const;

/* ── FAQ Accordion item (SEO-safe: always in DOM) ──────── */

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
      {/* Always in DOM for SEO — visibility toggled via CSS */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          open ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <p className="px-3 sm:px-4 pb-3 sm:pb-4 text-sm text-neo-white/60 leading-relaxed">
          {answer}
        </p>
      </div>
    </AdaptiveMotion.div>
  );
}

/* ── Main component ─────────────────────────────────────── */

interface LandingSEOSectionProps {
  className?: string;
}

export function LandingSEOSection({ className }: LandingSEOSectionProps) {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const c: LandingSEOContent = contentByLocale[locale] || contentByLocale.en;

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
          {c.whatIsTitle}
        </h2>
        <p className="text-sm sm:text-base text-neo-white/60 leading-relaxed max-w-2xl mx-auto">
          {c.whatIsShort}
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
          {c.featuresTitle}
        </h2>
        <AdaptiveMotion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        >
          {c.gameModes.map((mode, i) => {
            const Icon = MODE_ICONS[i];
            const s = MODE_STYLES[i];
            return (
              <AdaptiveMotion.div
                key={mode.title}
                variants={staggerItem}
                whileHover={{ y: -6, scale: 1.03, transition: { type: 'spring', stiffness: 400, damping: 15 } }}
                className={cn(
                  'relative p-4 sm:p-5 rounded-neo border-2 border-neo-white/10',
                  'bg-gradient-to-b', s.gradient, s.borderHover,
                  'flex flex-col items-center text-center gap-3',
                  'transition-all duration-300 cursor-default select-none',
                  'overflow-hidden group'
                )}
              >
                <div className={cn(
                  'absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-500',
                  s.glowBg
                )} />
                <div className={cn('relative p-3 rounded-neo border', s.iconBg)}>
                  <Icon className={cn('w-6 h-6 sm:w-7 sm:h-7', s.iconColor)} aria-hidden="true" />
                </div>
                <div className="relative flex flex-col gap-1">
                  <p className="font-black text-neo-white text-xs sm:text-sm uppercase leading-tight">
                    {mode.title}
                  </p>
                  <span className="text-[10px] sm:text-xs font-semibold text-neo-white/50 uppercase tracking-widest">
                    {mode.tag}
                  </span>
                </div>
              </AdaptiveMotion.div>
            );
          })}
        </AdaptiveMotion.div>
      </AdaptiveMotion.div>

      {/* ── How to Play — connected timeline flow ── */}
      <AdaptiveMotion.div
        className="mb-14 sm:mb-16"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-xl sm:text-2xl font-black uppercase text-neo-white text-center mb-10 neo-title">
          {c.howToPlayTitle}
        </h2>
        <AdaptiveMotion.div
          className="relative grid grid-cols-2 sm:grid-cols-4 gap-y-8 gap-x-4 sm:gap-x-2"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        >
          <div className="hidden sm:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-neo-pink/40 via-neo-cyan/40 via-50% to-neo-purple/40" aria-hidden="true" />
          {c.steps.map((step, i) => {
            const StepIcon = STEP_ICONS[i];
            return (
              <AdaptiveMotion.div
                key={i}
                variants={staggerItem}
                className="flex flex-col items-center text-center gap-3 relative"
              >
                <div className={cn(
                  'relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-full',
                  'flex items-center justify-center',
                  'border-3 border-neo-black',
                  STEP_BG[i], STEP_GLOW[i],
                  'transition-shadow duration-300'
                )}>
                  <span className="font-black text-neo-black text-xl sm:text-2xl">{i + 1}</span>
                </div>
                <div className={cn('p-2', STEP_COLORS[i])}>
                  <StepIcon className="w-5 h-5" aria-hidden="true" />
                </div>
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
          {c.highlights.map((text, i) => {
            const Icon = HIGHLIGHT_ICONS[i];
            return (
              <AdaptiveMotion.div
                key={text}
                variants={staggerItem}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2.5',
                  'rounded-neo border-2 border-neo-white/10',
                  'bg-neo-white/[0.03]',
                  'text-neo-white/70 font-bold text-xs sm:text-sm'
                )}
              >
                <Icon className="w-4 h-4 shrink-0 text-neo-white/60" aria-hidden="true" />
                {text}
              </AdaptiveMotion.div>
            );
          })}
        </AdaptiveMotion.div>
      </AdaptiveMotion.div>

      {/* ── Who Can Play — icon grid ── */}
      <AdaptiveMotion.div
        className="mb-14 sm:mb-16"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-xl sm:text-2xl font-black uppercase text-neo-white text-center mb-8 neo-title">
          {c.whoCanPlayTitle}
        </h2>
        <AdaptiveMotion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        >
          {c.whoCanPlayCards.map((card, i) => {
            const icons = [Smartphone, Users, BookOpen, Swords];
            const CardIcon = icons[i];
            const accentBg = ['bg-neo-cyan', 'bg-neo-lime', 'bg-neo-purple', 'bg-neo-pink'] as const;
            const iconBg = ['bg-neo-cyan/15 border-neo-cyan/25', 'bg-neo-lime/15 border-neo-lime/25', 'bg-neo-purple/15 border-neo-purple/25', 'bg-neo-pink/15 border-neo-pink/25'] as const;
            const iconText = ['text-neo-cyan', 'text-neo-lime', 'text-neo-purple', 'text-neo-pink'] as const;
            return (
              <AdaptiveMotion.div
                key={card.label}
                variants={staggerItem}
                className={cn(
                  'relative rounded-neo border-2 border-neo-white/10 p-5',
                  'bg-neo-white/[0.03] overflow-hidden',
                  'group hover:border-neo-white/20 transition-colors duration-200'
                )}
              >
                <div className={cn('absolute top-0 inset-x-0 h-0.5', accentBg[i])} />
                <div className="flex gap-4">
                  <div className={cn('shrink-0 w-10 h-10 rounded-neo border flex items-center justify-center', iconBg[i])}>
                    <CardIcon className={cn('w-5 h-5', iconText[i])} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-black text-neo-white text-sm sm:text-base mb-1">{card.label}</h3>
                    <p className="text-xs sm:text-sm text-neo-white/55 leading-relaxed">{card.detail}</p>
                  </div>
                </div>
              </AdaptiveMotion.div>
            );
          })}
        </AdaptiveMotion.div>
      </AdaptiveMotion.div>

      {/* ── Game Modes Explained — accent-bordered cards ── */}
      <AdaptiveMotion.div
        className="mb-14 sm:mb-16"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-xl sm:text-2xl font-black uppercase text-neo-white text-center mb-8 neo-title">
          {c.gameModesTitle}
        </h2>
        <AdaptiveMotion.div
          className="space-y-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        >
          {c.gameModesDetails.map((mode, i) => {
            const modeIcons = [Swords, Target, CalendarDays, Map];
            const ModeIcon = modeIcons[i];
            const barBg = ['bg-neo-pink', 'bg-neo-cyan', 'bg-neo-lime', 'bg-neo-purple'] as const;
            const circleBg = ['bg-neo-pink/15', 'bg-neo-cyan/15', 'bg-neo-lime/15', 'bg-neo-purple/15'] as const;
            const circleText = ['text-neo-pink', 'text-neo-cyan', 'text-neo-lime', 'text-neo-purple'] as const;
            return (
              <AdaptiveMotion.div
                key={mode.title}
                variants={staggerItem}
                className={cn(
                  'relative rounded-neo border-2 border-neo-white/10 p-4 sm:p-5',
                  'bg-neo-white/[0.02]',
                  'overflow-hidden'
                )}
              >
                <div className={cn('absolute top-0 bottom-0 start-0 w-1 rounded-s-neo', barBg[i])} />
                <div className="flex gap-4 ps-3">
                  <div className={cn('shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5', circleBg[i])}>
                    <ModeIcon className={cn('w-4 h-4', circleText[i])} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-black text-neo-white text-sm sm:text-base mb-1.5">{mode.title}</h3>
                    <p className="text-xs sm:text-sm text-neo-white/55 leading-relaxed">{mode.content}</p>
                  </div>
                </div>
              </AdaptiveMotion.div>
            );
          })}
        </AdaptiveMotion.div>
      </AdaptiveMotion.div>

      {/* ── Built for Learning — feature card with stats ── */}
      <AdaptiveMotion.div
        className="mb-14 sm:mb-16"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <div className={cn(
          'relative rounded-neo border-2 border-neo-purple/20 overflow-hidden',
          'bg-gradient-to-br from-neo-purple/10 via-neo-purple/5 to-transparent',
          'p-6 sm:p-8'
        )}>
          {/* Subtle glow */}
          <div className="absolute -top-16 -end-16 w-48 h-48 rounded-full bg-neo-purple/10 blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-neo border bg-neo-purple/15 border-neo-purple/25 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-neo-purple" aria-hidden="true" />
              </div>
              <h2 className="text-lg sm:text-xl font-black uppercase text-neo-white neo-title-sm">
                {c.educationTitle}
              </h2>
            </div>
            <p className="text-sm sm:text-base text-neo-white/60 leading-relaxed mb-6">
              {c.educationContent}
            </p>
            {/* Stats row */}
            <div className="flex gap-6 sm:gap-10">
              {c.educationStats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl sm:text-3xl font-black text-neo-purple">{stat.value}</div>
                  <div className="text-[10px] sm:text-xs font-bold text-neo-white/40 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdaptiveMotion.div>

      {/* ── FAQ ── */}
      <AdaptiveMotion.div
        className="mb-12 sm:mb-14"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-lg sm:text-xl font-black uppercase text-neo-white text-center mb-6 neo-title-sm">
          {c.faqTitle}
        </h2>
        <AdaptiveMotion.div
          className="space-y-2 max-w-2xl mx-auto"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        >
          {c.faq.map((item) => (
            <FAQItem key={item.question} question={item.question} answer={item.answer} />
          ))}
        </AdaptiveMotion.div>
      </AdaptiveMotion.div>

      {/* ── Community — CTA banner with stats ── */}
      <AdaptiveMotion.div
        className="mb-12 sm:mb-14"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <div className={cn(
          'relative rounded-neo border-2 border-neo-cyan/20 overflow-hidden',
          'bg-gradient-to-br from-neo-cyan/8 via-neo-pink/5 to-transparent',
          'p-6 sm:p-8 text-center'
        )}>
          {/* Decorative glow */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full bg-neo-cyan/8 blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="relative">
            <h2 className="text-lg sm:text-xl font-black uppercase text-neo-white mb-3 neo-title-sm">
              {c.communityTitle}
            </h2>
            <p className="text-sm sm:text-base text-neo-white/55 leading-relaxed max-w-xl mx-auto mb-6">
              {c.communityContent}
            </p>
            {/* Stats pills */}
            <div className="flex justify-center gap-4 sm:gap-8">
              {c.communityStats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl sm:text-3xl font-black text-neo-cyan">{stat.value}</div>
                  <div className="text-[10px] sm:text-xs font-bold text-neo-white/40 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdaptiveMotion.div>

      {/* ── Blog Links ── */}
      <AdaptiveMotion.div
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg sm:text-xl font-black uppercase text-neo-white">
            {c.blogTitle}
          </h2>
          <Link
            href={`/${locale}/blog`}
            className={cn(
              'text-xs sm:text-sm font-bold',
              'text-neo-white/60 hover:text-neo-white transition-colors',
              'underline underline-offset-2'
            )}
          >
            {c.viewAllPosts}
          </Link>
        </div>
        <AdaptiveMotion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        >
          {c.blogLinks.map((blog, i) => (
            <AdaptiveMotion.div key={blog.slug} variants={staggerItem}>
              <Link
                href={`/${locale}/blog/${blog.slug}`}
                className={cn(
                  'group block rounded-neo border-2 border-neo-white/10 overflow-hidden',
                  'bg-neo-white/[0.03]',
                  'hover:border-neo-white/20 hover:bg-neo-white/[0.06] hover:-translate-y-0.5',
                  'transition-all duration-200'
                )}
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <Image
                    src={BLOG_IMAGES[i]}
                    alt={blog.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <span className="absolute top-2 start-2 inline-block px-2 py-0.5 text-[10px] font-bold uppercase text-neo-white bg-neo-black/60 rounded-neo tracking-wider">
                    {blog.category}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold text-neo-white/80 group-hover:text-neo-white transition-colors line-clamp-2">
                    {blog.title}
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
