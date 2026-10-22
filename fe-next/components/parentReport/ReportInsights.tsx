import type { StudentInsights, WeekActivity, WordInsight } from '@/lib/education/studentInsights';

export type ReportT = (key: string, params?: Record<string, string | number>) => string;

interface ReportInsightsProps {
  insights: StudentInsights;
  name: string;
  t: ReportT;
}

const SECTION = 'break-inside-avoid rounded-neo border-2 border-neo-black bg-neo-white p-4 print:p-2.5 print:shadow-none';
const TITLE = 'font-neo-display text-lg font-bold text-neo-black print:text-base';

function Num({ children }: { children: React.ReactNode }) {
  return (
    <span dir="ltr" className="tabular-nums">
      {children}
    </span>
  );
}

function Stat({ value, label, meaning, className = '' }: { value: React.ReactNode; label: string; meaning: string; className?: string }) {
  return (
    <div className={`${SECTION} shadow-hard-sm print:p-2 ${className}`}>
      <div className="font-neo-display text-3xl font-bold text-neo-black print:text-2xl">{value}</div>
      <div className="mt-1 text-sm font-black text-neo-black">{label}</div>
      <p className="mt-1 text-xs text-neo-black/75">{meaning}</p>
    </div>
  );
}

function WeekTable({ thisWeek, lastWeek, t }: { thisWeek: WeekActivity; lastWeek: WeekActivity; t: ReportT }) {
  const dash = t('parentReport.noValue');
  const pctOf = (v: number | null) => (v === null ? dash : `${v}%`);
  const rows: Array<[string, string | number, string | number]> = [
    [t('parentReport.rowSessions'), thisWeek.sessions, lastWeek.sessions],
    [t('parentReport.rowMinutes'), thisWeek.minutes, lastWeek.minutes],
    [t('parentReport.rowActiveDays'), thisWeek.activeDays, lastWeek.activeDays],
    [t('parentReport.rowAccuracy'), pctOf(thisWeek.accuracy), pctOf(lastWeek.accuracy)],
  ];
  return (
    <section data-testid="report-week" className={SECTION}>
      <h2 className={TITLE}>{t('parentReport.weekTitle')}</h2>
      <table className="mt-2 print:mt-1 w-full border-collapse text-sm text-neo-black">
        <thead>
          <tr className="border-b-2 border-neo-black">
            <th scope="col" className="py-2 text-start font-bold">
              <span className="sr-only">{t('parentReport.weekTitle')}</span>
            </th>
            <th scope="col" className="px-2 py-2 text-center font-black print:py-1">{t('parentReport.weekThis')}</th>
            <th scope="col" className="px-2 py-2 text-center font-bold text-neo-black/75 print:py-1">{t('parentReport.weekLast')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, now, before]) => (
            <tr key={label} className="border-b border-neo-black/20 last:border-b-0">
              <th scope="row" className="py-2 text-start font-bold print:py-1">{label}</th>
              <td className="px-2 py-2 text-center font-black print:py-1"><Num>{now}</Num></td>
              <td className="px-2 py-2 text-center text-neo-black/75 print:py-1"><Num>{before}</Num></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function WordList({ testId, title, hint, words, t }: { testId: string; title: string; hint: string; words: WordInsight[]; t: ReportT }) {
  return (
    <section data-testid={testId} className={SECTION}>
      <h2 className={TITLE}>{title}</h2>
      <p className="text-xs text-neo-black/75">{hint}</p>
      <ul className="mt-3 space-y-1.5 print:mt-1.5 print:space-y-1">
        {words.map((w) => (
          <li key={w.word} className="flex items-baseline justify-between gap-3 border-b border-neo-black/20 pb-1.5 last:border-b-0 print:pb-1">
            <bdi className="min-w-0 break-words font-bold text-neo-black">{w.word}</bdi>
            <span className="shrink-0 text-xs font-bold text-neo-black/75">
              {w.accuracy === null ? t('parentReport.wordMastered') : t('parentReport.wordAccuracy', { value: w.accuracy })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The insight body shared by the parent page and the teacher's preview of it. */
export function ReportInsights({ insights, name, t }: ReportInsightsProps) {
  const { thisWeek, lastWeek, wordsToPractice, recentWins } = insights;
  const hasWeeks = thisWeek.sessions > 0 || lastWeek.sessions > 0;
  const hasStreak = insights.longestStreak > 0 || insights.currentStreak > 0;
  const activityWords = (insights.activity === 'celebrate_wins' ? recentWins : wordsToPractice)
    .slice(0, 3)
    .map((w) => w.word)
    .join(', ');

  return (
    <div className="space-y-4 print:space-y-3">
      <div data-testid="report-headline" className={`grid grid-cols-2 gap-3 ${hasStreak ? 'md:grid-cols-4 print:grid-cols-4' : 'md:grid-cols-3 print:grid-cols-3'}`}>
        <Stat value={<Num>{insights.wordsMastered}</Num>} label={t('parentReport.statWords')} meaning={t('parentReport.statWordsMeaning')} />
        <Stat
          value={<Num>{insights.accuracy === null ? t('parentReport.noValue') : `${insights.accuracy}%`}</Num>}
          label={t('parentReport.statAccuracy')}
          meaning={t('parentReport.statAccuracyMeaning')}
        />
        <Stat
          value={<Num>{thisWeek.minutes}</Num>}
          label={t('parentReport.statWeekMinutes')}
          meaning={t('parentReport.statWeekMinutesMeaning')}
          className={hasStreak ? '' : 'col-span-2 md:col-span-1 print:col-span-1'}
        />
        {hasStreak && (
          <Stat
            value={<Num>{insights.currentStreak}</Num>}
            label={t('parentReport.statStreak')}
            meaning={t('parentReport.statStreakMeaning', { best: insights.longestStreak })}
          />
        )}
      </div>

      <section data-testid="report-insight" className={`${SECTION} border-s-8 border-s-neo-purple`}>
        <h2 className={TITLE}>{t('parentReport.insightTitle')}</h2>
        <p className="mt-1 text-base text-neo-black print:text-sm">
          {t(`parentReport.insight.${insights.insight}`, { name, count: thisWeek.sessions, previous: lastWeek.sessions })}
        </p>
        <div data-testid="report-activity" className="mt-3 rounded-neo border-2 border-dashed border-neo-black p-3 print:mt-2 print:p-2">
          <p className="text-xs font-black uppercase tracking-wide text-neo-black">{t('parentReport.activityTitle')}</p>
          <p className="mt-1 text-sm text-neo-black">
            {t(`parentReport.activity.${insights.activity}`, { name, words: activityWords })}
          </p>
        </div>
      </section>

      {hasWeeks && <WeekTable thisWeek={thisWeek} lastWeek={lastWeek} t={t} />}

      {(wordsToPractice.length > 0 || recentWins.length > 0) && (
        <div className={`grid gap-4 print:gap-3 ${wordsToPractice.length > 0 && recentWins.length > 0 ? 'md:grid-cols-2 print:grid-cols-2' : ''}`}>
          {wordsToPractice.length > 0 && (
            <WordList testId="report-practice" title={t('parentReport.practiceTitle')} hint={t('parentReport.practiceHint')} words={wordsToPractice} t={t} />
          )}
          {recentWins.length > 0 && (
            <WordList testId="report-wins" title={t('parentReport.winsTitle')} hint={t('parentReport.winsHint')} words={recentWins} t={t} />
          )}
        </div>
      )}
    </div>
  );
}
