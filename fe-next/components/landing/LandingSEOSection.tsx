'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { type Variants } from 'framer-motion';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import {
  ChevronDown, Plus, Minus, MousePointerClick, Layers, Trophy, Target,
  GraduationCap,
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
        <ChevronDown className="w-5 h-5 text-neo-black/30 dark:text-neo-white" />
      </AdaptiveMotion.div>
    </AdaptiveMotion.div>
  );
}

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

/* ── FAQ Accordion item (SEO-safe: always in DOM) ──────── */

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <AdaptiveMotion.div
      className={cn(
        'border-2 border-neo-white/10 rounded-neo overflow-hidden',
        'bg-neo-white/3',
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
            <Minus className="w-4 h-4 text-neo-white" />
          ) : (
            <Plus className="w-4 h-4 text-neo-white" />
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
        <p className="px-3 sm:px-4 pb-3 sm:pb-4 text-sm text-neo-white leading-relaxed">
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
        <p className="text-sm sm:text-base text-neo-white leading-relaxed max-w-2xl mx-auto">
          {c.whatIsShort}
        </p>
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
          <div className="hidden sm:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-linear-to-r from-neo-pink/40 via-neo-cyan/40 via-50% to-neo-purple/40" aria-hidden="true" />
          {c.steps.map((step, i) => {
            const StepIcon = STEP_ICONS[i];
            return (
              <AdaptiveMotion.div
                key={step}
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
                <span className="text-xs sm:text-sm font-bold text-neo-white leading-tight max-w-[140px]">
                  {step}
                </span>
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
          'bg-linear-to-br from-neo-purple/10 via-neo-purple/5 to-transparent',
          'p-6 sm:p-8'
        )}>
          {/* Subtle glow */}
          <div className="absolute -top-16 -inset-e-16 w-48 h-48 rounded-full bg-neo-purple/10 blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-neo border bg-neo-purple/15 border-neo-purple/25 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-neo-purple" aria-hidden="true" />
              </div>
              <h2 className="text-lg sm:text-xl font-black uppercase text-neo-white neo-title-sm">
                {c.educationTitle}
              </h2>
            </div>
            <p className="text-sm sm:text-base text-neo-white leading-relaxed mb-6">
              {c.educationContent}
            </p>
            {/* Stats row */}
            <div className="flex gap-6 sm:gap-10">
              {c.educationStats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl sm:text-3xl font-black text-neo-purple">{stat.value}</div>
                  <div className="text-[10px] sm:text-xs font-bold text-neo-white uppercase tracking-wider">{stat.label}</div>
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

    </section>
  );
}
