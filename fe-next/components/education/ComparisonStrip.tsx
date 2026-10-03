'use client';
import { useLanguage } from '@/contexts/LanguageContext';

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

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
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
                  fi % 2 === 0 ? 'bg-neo-white' : 'bg-neo-cream'
                } border-b border-neo-navy`}
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
                        className="inline-block text-neo-navy text-lg"
                      >
                        ✓
                      </span>
                    ) : (
                      <span className="text-neo-navy/80">—</span>
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
