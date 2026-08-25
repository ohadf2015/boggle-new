'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { PLAN_MATRIX_ROWS, type PlanMatrixCell } from '@/lib/education/planMatrix';

/**
 * Free vs Teacher Pro, with the rows aligned.
 *
 * The upgrade page's two cards each describe a tier in its own words and its own order, so
 * a teacher cannot read across them — the Free card's "Unlimited classes ✗" and the Pro
 * card's "Unlimited classes without cap worry" are the same fact stated twice, unaligned.
 * This is that comparison as a real table, which is the one thing two cards side by side
 * structurally cannot be.
 *
 * Six rows against Kahoot's hundred is deliberate. Their matrix is long because their
 * product is; padding ours with rows both columns tick would make the free tier look
 * arbitrary and the paid one thin. The three shared ticks that ARE here do real work: a
 * column of nothing but crosses reads as a crippled free tier, and ours genuinely is not.
 */
export function PlanComparisonMatrix() {
  const { t } = useLanguage();

  /**
   * `number` prints the cap, `null` is unlimited, a boolean is a tick or a cross. The mark
   * is decorative and hidden; the word beside it carries the meaning. A glyph-only column
   * is silent to a screen reader and blank in any font missing ✓/✗.
   */
  function Cell({ value }: { value: PlanMatrixCell }) {
    if (typeof value === 'number') {
      return <span className="font-neo-display font-black text-lg">{value}</span>;
    }
    if (value === null) {
      return (
        <span className="font-neo-display font-black text-neo-lime">
          {t('teacher.subscription.matrix.unlimited')}
        </span>
      );
    }
    return (
      <>
        <span
          data-plan-mark
          aria-hidden="true"
          className={value ? 'text-neo-lime font-black' : 'text-neo-white/40 font-black'}
        >
          {value ? '✓' : '✗'}
        </span>
        <span className="sr-only">
          {t(
            value
              ? 'teacher.subscription.matrix.included'
              : 'teacher.subscription.matrix.notIncluded',
          )}
        </span>
      </>
    );
  }

  return (
    <section className="mb-12">
      <h2 className="text-2xl sm:text-3xl font-neo-display font-black text-neo-white text-center mb-6">
        {t('teacher.subscription.matrix.title')}
      </h2>

      {/* Horizontal scroll container, not a squeeze: at 390px three columns of short values
          fit, but a long row label in German-length Swedish or Russian would otherwise force
          the whole page body to scroll sideways. Keep the overflow on the wrapper. */}
      <div className="overflow-x-auto rounded-neo border-neo border-black shadow-hard">
        <table className="w-full border-collapse bg-neo-navy-light text-start">
          <thead>
            <tr className="border-b-2 border-black">
              <th
                scope="col"
                className="p-3 sm:p-4 text-start font-neo-display font-black text-neo-white/80 text-sm sm:text-base"
              >
                {t('teacher.subscription.matrix.featureColumn')}
              </th>
              <th
                scope="col"
                className="p-3 sm:p-4 text-center font-neo-display font-black text-neo-white text-sm sm:text-base"
              >
                {t('teacher.subscription.freePlanName')}
              </th>
              {/* The paid column is the lime one everywhere else on this page; carrying that
                  through means the eye lands on it without the table needing a badge. */}
              <th
                scope="col"
                className="p-3 sm:p-4 text-center font-neo-display font-black bg-neo-lime text-neo-navy text-sm sm:text-base"
              >
                {t('teacher.subscription.proPlanName')}
              </th>
            </tr>
          </thead>
          <tbody>
            {PLAN_MATRIX_ROWS.map((row) => (
              <tr key={row.key} className="border-b border-neo-white/15 last:border-b-0">
                <th
                  scope="row"
                  className="p-3 sm:p-4 text-start font-bold text-neo-white text-sm sm:text-base"
                >
                  {t(`teacher.subscription.matrix.${row.key}`)}
                </th>
                <td className="p-3 sm:p-4 text-center text-neo-white">
                  <Cell value={row.free} />
                </td>
                <td className="p-3 sm:p-4 text-center text-neo-white bg-neo-lime/10">
                  <Cell value={row.pro} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
