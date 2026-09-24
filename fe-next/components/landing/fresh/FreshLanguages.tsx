'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { LANGUAGE_CONFIG } from '@/lib/languageConfig';
import { cn } from '@/lib/utils';
import s from './FreshMotion.module.css';

type LangCode = 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';

/**
 * "Word", in each supported language. Display data, not UI copy: every
 * visitor sees all six (like a language picker's endonyms), so none of it
 * goes through t(). Hebrew is spelled logically and rendered with dir="rtl".
 */
const WORDS: { code: LangCode; word: string; rtl?: boolean }[] = [
  { code: 'en', word: 'WORD' },
  { code: 'he', word: 'מילה', rtl: true },
  { code: 'sv', word: 'ORD' },
  { code: 'ja', word: 'ことば' },
  { code: 'es', word: 'PALABRA' },
  { code: 'ru', word: 'СЛОВО' },
];

/** The visitor's language first (it is the face shown at rest), then the rest. */
function ordered(language: string) {
  const i = WORDS.findIndex((w) => w.code === language);
  return i <= 0 ? WORDS : [WORDS[i], ...WORDS.slice(0, i), ...WORDS.slice(i + 1)];
}

/**
 * Section 5: one game, six languages (RTL included). Absorbs WhoPlays.
 * A different layout family from its split neighbours: centred, full width,
 * the word board is the visual and the endonym chips are the links.
 */
export function FreshLanguages() {
  const { t, language } = useLanguage();
  const words = ordered(language);

  return (
    <section
      data-fresh-section="languages"
      aria-labelledby="fresh-languages-title"
      className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 py-14 text-center sm:px-6 md:gap-10 md:py-24 lg:px-8"
    >
      <div className="flex max-w-2xl flex-col items-center gap-4">
        <h2
          id="fresh-languages-title"
          className="font-neo-display text-3xl font-bold leading-[1.08] text-neo-cream text-balance sm:text-4xl md:text-5xl"
        >
          {t('homeFresh.sections.languages.title')}
        </h2>
        <p className="max-w-[44ch] font-neo-body text-base leading-relaxed text-neo-cream/80 md:text-lg">
          {t('homeFresh.sections.languages.line')}
        </p>
      </div>

      <div aria-hidden="true" className="relative max-w-full pt-14 md:pt-16">
        <div
          className={cn(
            'absolute start-1/2 top-0 z-10 aspect-square w-20 -translate-x-1/2 bg-[url(/home/shell/lang-hello.webp)] bg-contain bg-center bg-no-repeat rtl:translate-x-1/2 md:w-24',
            s.bob
          )}
        />
        <div className="inline-grid min-h-[104px] place-items-center rounded-neo-lg border-3 border-neo-lime bg-neo-navy-light px-3 py-6 shadow-[6px_6px_0_0_rgb(0_0_0)] md:min-h-[152px] md:px-10 md:py-8 lg:min-h-[176px]">
          {words.map((w, f) => (
            <div
              key={w.code}
              data-lang-face
              data-rest={f === 0 ? 'true' : 'false'}
              lang={w.code}
              dir={w.rtl ? 'rtl' : 'ltr'}
              style={{ '--f': f } as CSSProperties}
              className={cn(
                'col-start-1 row-start-1 flex gap-1.5 [perspective:600px] md:gap-2.5',
                s.face,
                f === 0 && s.faceRest
              )}
            >
              {Array.from(w.word).map((ch, i) => (
                <span
                  key={i}
                  data-tile
                  style={{ '--t': i } as CSSProperties}
                  className={cn(
                    'flex h-12 w-10 items-center justify-center rounded-[8px] border-3 border-neo-black bg-neo-cream',
                    'font-neo-display text-2xl font-bold text-neo-black shadow-hard md:h-20 md:w-16 md:text-4xl lg:h-24 lg:w-20 lg:text-5xl',
                    s.tile
                  )}
                >
                  {ch}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <ul className="flex max-w-2xl flex-wrap justify-center gap-2 md:gap-3">
        {words.map((w, f) => (
          <li key={w.code}>
            <Link
              href={`/${w.code}`}
              lang={w.code}
              style={{ '--f': f } as CSSProperties}
              className={cn(
                'relative inline-flex items-center rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light px-4 py-2',
                'font-neo-body text-sm font-bold text-neo-cream shadow-hard-sm md:text-base',
                'active:translate-y-[1px] active:shadow-hard-pressed motion-safe:transition-transform motion-safe:hover:-translate-y-0.5',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neo-lime'
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'pointer-events-none absolute -inset-[2px] rounded-neo border-3 border-neo-lime',
                  s.chipGlow,
                  f === 0 && s.chipGlowRest
                )}
              />
              {LANGUAGE_CONFIG[w.code].nativeName}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
