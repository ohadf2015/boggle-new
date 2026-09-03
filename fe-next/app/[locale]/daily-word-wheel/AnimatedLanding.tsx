'use client';

import Link from 'next/link';
import { m, useReducedMotion } from 'framer-motion';
import { CalendarDays, Search, Timer, Trophy, type LucideIcon } from 'lucide-react';
import { RankingPlayEmbed } from './RankingPlayEmbed';

interface AnimatedLandingProps {
  locale: string;
  hero: { title: string; subtitle: string; description: string; cta: string; leaderboard: string };
  rulesHeading?: string;
  rules?: string[];
  steps: Array<{ step: string; title: string; desc: string }>;
  stepsHeading: string;
  faqHeading: string;
  faqItems: Array<Record<string, string>>;
  finalCta: { heading: string; description: string; button: string };
}

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.12 } } } as const;
const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } } };
const scaleIn = { hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 20 } } };

const STEP_ICONS: LucideIcon[] = [CalendarDays, Search, Timer, Trophy];
const STEP_ACCENTS = [
  { border: 'border-neo-lime/60', ring: 'border-neo-lime', text: 'text-neo-lime', glow: '0 0 24px rgba(191,255,0,0.28)' },
  { border: 'border-neo-cyan/60', ring: 'border-neo-cyan', text: 'text-neo-cyan', glow: '0 0 24px rgba(0,255,255,0.28)' },
  { border: 'border-neo-pink/60', ring: 'border-neo-pink', text: 'text-neo-pink', glow: '0 0 24px rgba(255,20,147,0.28)' },
  { border: 'border-neo-purple/60', ring: 'border-neo-purple', text: 'text-neo-purple', glow: '0 0 24px rgba(139,92,246,0.28)' },
] as const;

export function AnimatedLanding({ locale, hero, rulesHeading, rules, steps, stepsHeading, faqHeading, faqItems, finalCta }: AnimatedLandingProps) {
  const isRtl = locale === 'he';
  const prefersReduced = useReducedMotion();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Hero — H1 + lead + rules first so the first 60 words answer the query */}
      <m.section
        className="mb-12 text-center"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <m.div
          className="mb-2 inline-block rounded-full border-2 border-neo-lime/40 bg-neo-lime/10 px-4 py-1"
          variants={scaleIn}
        >
          <span className="font-neo-display text-xs font-bold uppercase tracking-wider text-neo-lime">
            {hero.subtitle}
          </span>
        </m.div>

        <m.h1
          className="mb-4 font-neo-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl"
          variants={fadeUp}
        >
          {hero.title}
        </m.h1>

        <m.p
          className="mx-auto mb-6 max-w-2xl text-lg leading-relaxed text-neo-white"
          variants={fadeUp}
        >
          {hero.description}
        </m.p>

        {rules && rules.length > 0 ? (
          <m.div className="mx-auto mb-8 max-w-2xl text-left" variants={fadeUp}>
            {rulesHeading ? (
              <h2 className="mb-3 font-neo-display text-2xl font-bold sm:text-3xl">{rulesHeading}</h2>
            ) : null}
            <ul className="list-disc space-y-2 pl-6 text-base leading-relaxed text-neo-white">
              {rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </m.div>
        ) : null}

        <RankingPlayEmbed locale={locale} />

        <m.div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4" variants={fadeUp}>
          <Link
            href={`/${locale}/daily/word-wheel`}
            className="w-full rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg active:shadow-hard-pressed active:translate-x-px active:translate-y-px sm:w-auto sm:px-8 sm:py-4"
          >
            {hero.cta}
          </Link>
          <Link
            href={`/${locale}/leaderboard`}
            className="w-full rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 active:shadow-hard-pressed active:translate-x-px active:translate-y-px sm:w-auto sm:px-8 sm:py-4"
          >
            {hero.leaderboard}
          </Link>
        </m.div>
      </m.section>

      {/* Steps — icon-driven, alternating-direction entrance */}
      <m.section
        className="mb-12"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.14 } } }}
      >
        <m.h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl" variants={fadeUp}>
          {stepsHeading}
        </m.h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {steps.map((item, idx) => {
            const Icon = STEP_ICONS[idx % STEP_ICONS.length];
            const accent = STEP_ACCENTS[idx % STEP_ACCENTS.length];
            const fromLeft = idx % 2 === 0;
            const offset = (fromLeft ? -1 : 1) * (isRtl ? -32 : 32);
            return (
              <m.div
                key={item.step}
                className={`group relative flex gap-4 rounded-neo border-[3px] ${accent.border} bg-neo-navy-light p-5 shadow-hard`}
                variants={{
                  hidden: { opacity: 0, x: offset, y: 16, scale: 0.94 },
                  visible: {
                    opacity: 1,
                    x: 0,
                    y: 0,
                    scale: 1,
                    transition: { type: 'spring' as const, stiffness: 220, damping: 18 },
                  },
                }}
                whileHover={prefersReduced ? undefined : { y: -3, boxShadow: accent.glow, transition: { duration: 0.2 } }}
              >
                <m.span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-neo border-[3px] ${accent.ring} bg-neo-navy ${accent.text}`}
                  initial={{ rotate: -12, scale: 0 }}
                  whileInView={{ rotate: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + idx * 0.08, type: 'spring', stiffness: 320, damping: 14 }}
                >
                  <Icon className="h-6 w-6" strokeWidth={2.5} aria-hidden />
                </m.span>
                <div className="min-w-0">
                  <div className={`mb-1 font-neo-display text-xs font-bold uppercase tracking-wider ${accent.text}`}>
                    {item.step}
                  </div>
                  <h3 className="font-neo-display font-bold text-neo-white">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-neo-white">{item.desc}</p>
                </div>
              </m.div>
            );
          })}
        </div>
      </m.section>

      {/* FAQ */}
      {faqItems.length > 0 && (
        <m.section
          className="mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
        >
          <m.h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl" variants={fadeUp}>
            {faqHeading}
          </m.h2>
          <div className="space-y-4">
            {faqItems.map((faq, idx) => (
              <m.details
                key={`faq-${idx}-${faq.q}`}
                className="group rounded-neo border-[3px] border-neo-cream/20 bg-neo-navy-light shadow-hard"
                variants={fadeUp}
              >
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-bold">
                  <span>{faq.q}</span>
                  <span className="text-neo-lime transition-transform group-open:rotate-180">&#9660;</span>
                </summary>
                <div className="border-t border-neo-cream/20 px-6 py-4 text-neo-white">{faq.a}</div>
              </m.details>
            ))}
          </div>
        </m.section>
      )}

      {/* Final CTA */}
      <m.section
        className="mb-12"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        variants={stagger}
      >
        <m.h2 className="font-neo-display text-2xl font-bold sm:text-3xl" variants={fadeUp}>
          {finalCta.heading}
        </m.h2>
        <m.p className="mt-4 text-neo-white" variants={fadeUp}>
          {finalCta.description}
        </m.p>
        <m.div className="mt-6" variants={scaleIn}>
          <Link
            href={`/${locale}/daily/word-wheel`}
            className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg active:shadow-hard-pressed active:translate-x-px active:translate-y-px"
          >
            {finalCta.button}
          </Link>
        </m.div>
      </m.section>
    </div>
  );
}
