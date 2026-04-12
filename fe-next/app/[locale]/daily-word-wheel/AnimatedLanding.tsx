'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

interface AnimatedLandingProps {
  locale: string;
  hero: { title: string; subtitle: string; description: string; cta: string; leaderboard: string };
  steps: Array<{ step: string; title: string; desc: string }>;
  stepsHeading: string;
  faqHeading: string;
  faqItems: Array<Record<string, string>>;
  finalCta: { heading: string; description: string; button: string };
}

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.12 } } } as const;
const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } } };
const scaleIn = { hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 20 } } };

// Decorative spinning wheel for the hero
function HeroWheel() {
  const letters = ['L', 'E', 'X', 'I', 'C', 'L'];
  return (
    <div className="relative mx-auto mb-6 h-36 w-36 sm:h-44 sm:w-44">
      {/* Outer glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-neo-lime/30"
        style={{ boxShadow: '0 0 40px rgba(191,255,0,0.15)' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />
      {/* Center letter */}
      <motion.div
        className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-3 border-neo-black bg-neo-lime font-neo-display text-xl font-black text-neo-black shadow-[3px_3px_0px_black,0_0_20px_rgba(191,255,0,0.5)]"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        A
      </motion.div>
      {/* Orbiting letters */}
      {letters.map((letter, i) => {
        const angle = i * 60;
        const rad = (angle * Math.PI) / 180;
        const r = 55;
        const x = Math.sin(rad) * r;
        const y = -Math.cos(rad) * r;
        return (
          <motion.div
            key={`${letter}-${i}`}
            className="absolute left-1/2 top-1/2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-neo-black bg-neo-white font-neo-display text-sm font-bold text-neo-navy shadow-[2px_2px_0px_black]"
            style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.08, type: 'spring', stiffness: 400, damping: 15 }}
          >
            {letter}
          </motion.div>
        );
      })}
    </div>
  );
}

export function AnimatedLanding({ locale, hero, steps, stepsHeading, faqHeading, faqItems, finalCta }: AnimatedLandingProps) {
  const isRtl = locale === 'he';

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Hero */}
      <motion.section
        className="mb-12 text-center"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <HeroWheel />

        <motion.div
          className="mb-2 inline-block rounded-full border-2 border-neo-lime/40 bg-neo-lime/10 px-4 py-1"
          variants={scaleIn}
        >
          <span className="font-neo-display text-xs font-bold uppercase tracking-wider text-neo-lime">
            {hero.subtitle}
          </span>
        </motion.div>

        <motion.h1
          className="mb-4 font-neo-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl"
          variants={fadeUp}
        >
          {hero.title}
        </motion.h1>

        <motion.p
          className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-neo-gray-200"
          variants={fadeUp}
        >
          {hero.description}
        </motion.p>

        <motion.div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4" variants={fadeUp}>
          <Link
            href={`/${locale}/daily/word-wheel`}
            className="w-full rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg active:shadow-hard-pressed active:translate-x-px active:translate-y-px sm:w-auto sm:px-8 sm:py-4"
          >
            {hero.cta}
          </Link>
          <Link
            href={`/${locale}/leaderboard`}
            className="w-full rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 active:shadow-hard-pressed sm:w-auto sm:px-8 sm:py-4"
          >
            {hero.leaderboard}
          </Link>
        </motion.div>
      </motion.section>

      {/* Steps */}
      <motion.section
        className="mb-12"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        variants={stagger}
      >
        <motion.h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl" variants={fadeUp}>
          {stepsHeading}
        </motion.h2>
        <div className="space-y-4">
          {steps.map((item) => (
            <motion.div
              key={item.step}
              className="flex gap-4 rounded-neo border-3 border-neo-cyan/60 bg-neo-navy-light p-5 shadow-hard"
              variants={fadeUp}
              whileHover={{ x: isRtl ? -4 : 4, transition: { duration: 0.2 } }}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-3 border-neo-lime font-neo-display text-lg font-bold text-neo-lime">
                {item.step}
              </span>
              <div>
                <h3 className="font-neo-display font-bold text-neo-cyan">{item.title}</h3>
                <p className="text-sm text-neo-gray-200">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* FAQ */}
      {faqItems.length > 0 && (
        <motion.section
          className="mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
        >
          <motion.h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl" variants={fadeUp}>
            {faqHeading}
          </motion.h2>
          <div className="space-y-4">
            {faqItems.map((faq, idx) => (
              <motion.details
                key={idx}
                className="group rounded-neo border-3 border-neo-gray-400 bg-neo-navy-light shadow-hard"
                variants={fadeUp}
              >
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-bold">
                  <span>{faq.q}</span>
                  <span className="text-neo-lime transition-transform group-open:rotate-180">&#9660;</span>
                </summary>
                <div className="border-t border-neo-gray-400 px-6 py-4 text-neo-gray-200">{faq.a}</div>
              </motion.details>
            ))}
          </div>
        </motion.section>
      )}

      {/* Final CTA */}
      <motion.section
        className="mb-12"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        variants={stagger}
      >
        <motion.h2 className="font-neo-display text-2xl font-bold sm:text-3xl" variants={fadeUp}>
          {finalCta.heading}
        </motion.h2>
        <motion.p className="mt-4 text-neo-gray-200" variants={fadeUp}>
          {finalCta.description}
        </motion.p>
        <motion.div className="mt-6" variants={scaleIn}>
          <Link
            href={`/${locale}/daily/word-wheel`}
            className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg active:shadow-hard-pressed active:translate-x-px active:translate-y-px"
          >
            {finalCta.button}
          </Link>
        </motion.div>
      </motion.section>
    </div>
  );
}
