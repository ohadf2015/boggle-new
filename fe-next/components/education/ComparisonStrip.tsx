'use client';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useLanguage } from '@/contexts/LanguageContext';
import { isReducedMotionPreferred } from '@/utils/accessibility';

const COMPETITORS = ['lexiclash', 'kahoot', 'quizlet', 'wordwall'] as const;
const FEATURES = [
  'native_multilingual',
  'ad_free_students',
  'live_multiplayer',
  'brain_training',
  'game_variety',
  'free_for_teachers',
] as const;

const MATRIX: Record<
  (typeof FEATURES)[number],
  Record<(typeof COMPETITORS)[number], boolean>
> = {
  native_multilingual: {
    lexiclash: true,
    kahoot: false,
    quizlet: false,
    wordwall: false,
  },
  ad_free_students: { lexiclash: true, kahoot: false, quizlet: false, wordwall: false },
  live_multiplayer: { lexiclash: true, kahoot: true, quizlet: false, wordwall: false },
  brain_training: { lexiclash: true, kahoot: false, quizlet: false, wordwall: false },
  game_variety: { lexiclash: true, kahoot: false, quizlet: false, wordwall: true },
  free_for_teachers: {
    lexiclash: true,
    kahoot: false,
    quizlet: false,
    wordwall: false,
  },
};

export function ComparisonStrip() {
  const { t } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const rm = isReducedMotionPreferred();
    const heading = section.querySelectorAll<HTMLElement>('[data-compare-head]');
    const tableEl = section.querySelector<HTMLElement>('[data-compare-table]');
    const checks = section.querySelectorAll<HTMLElement>('[data-compare-check]');
    const rows = section.querySelectorAll<HTMLElement>('[data-compare-row]');

    if (rm) {
      gsap.set([...heading, tableEl, ...rows, ...checks].filter(Boolean) as Element[], {
        opacity: 1,
        y: 0,
        scale: 1,
      });
      return;
    }

    gsap.set(heading, { opacity: 0, y: 18 });
    if (tableEl) gsap.set(tableEl, { opacity: 0, y: 24 });
    gsap.set(rows, { opacity: 0, x: -12 });
    gsap.set(checks, { opacity: 0, scale: 0.4 });

    let played = false;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || played) return;
        played = true;

        const tl = gsap.timeline();
        tl.to(heading, {
          opacity: 1,
          y: 0,
          duration: 0.55,
          ease: 'power3.out',
          stagger: 0.08,
        });
        if (tableEl) {
          tl.to(
            tableEl,
            { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' },
            '-=0.3',
          );
        }
        tl.to(
          rows,
          {
            opacity: 1,
            x: 0,
            duration: 0.4,
            ease: 'power2.out',
            stagger: 0.06,
          },
          '-=0.25',
        );
        tl.to(
          checks,
          {
            opacity: 1,
            scale: 1,
            duration: 0.35,
            ease: 'back.out(2.4)',
            stagger: 0.05,
          },
          '-=0.2',
        );

        obs.disconnect();
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );
    obs.observe(section);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <h2
        data-compare-head
        className="text-3xl font-neo-display font-black text-neo-white"
      >
        {t('education.landing.compare.title')}
      </h2>
      <p data-compare-head className="mt-2 text-neo-white">
        {t('education.landing.compare.subtitle')}
      </p>

      <div
        data-compare-table
        className="mt-6 overflow-x-auto rounded-neo border-neo-thick border-neo-navy"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neo-cream border-b-neo-thick border-b-neo-navy">
              <th className="p-3 text-start font-bold text-neo-navy" />
              {COMPETITORS.map((c) => (
                <th
                  key={c}
                  className={`p-3 text-center font-bold text-neo-navy ${
                    c === 'lexiclash' ? 'bg-neo-lime' : 'bg-neo-cream'
                  }`}
                >
                  {t(`education.landing.compare.col.${c}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f, fi) => (
              <tr
                key={f}
                data-compare-row
                className={`${
                  fi % 2 === 0 ? 'bg-neo-cream/40' : 'bg-neo-cream'
                } border-b border-neo-navy/20`}
              >
                <td className="p-3 font-bold text-neo-navy text-sm">
                  {t(`education.landing.compare.row.${f}`)}
                </td>
                {COMPETITORS.map((c) => (
                  <td
                    key={c}
                    className={`p-3 text-center font-bold ${
                      c === 'lexiclash' ? 'bg-neo-lime/20' : ''
                    }`}
                  >
                    {MATRIX[f][c] ? (
                      <span
                        data-compare-check
                        className="inline-block text-neo-lime-dark text-lg"
                      >
                        ✓
                      </span>
                    ) : (
                      <span className="text-neo-navy/40">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
