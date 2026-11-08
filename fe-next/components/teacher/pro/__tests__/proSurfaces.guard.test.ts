import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../../..');

const PRO_SURFACES = [
  'components/teacher/pro/ProBanner.tsx',
  'components/teacher/TeacherProCheckoutButton.tsx',
  'components/teacher/TeacherProTrialLifecycleBanner.tsx',
  'components/teacher/TeacherProTrialEndedBanner.tsx',
  'components/teacher/TeacherProTrialExpiringBanner.tsx',
  'components/teacher/PendingCheckoutBanner.tsx',
  'components/teacher/CheckoutReturnCapture.tsx',
  'components/teacher/ProGate.tsx',
  'components/teacher/reports/MasteryLockedTeaser.tsx',
  'components/teacher/home/HomeProCard.tsx',
  'components/education/TeacherTrialReminderBanner.tsx',
  'components/education/TrialUrgencyBanner.tsx',
  'components/education/TeacherProCompareCheckoutStrip.tsx',
];

const OFF_BRAND = [
  /\bborder-b-3\b/,
  /\bborder-black\b/,
  /\bbg-white\b/,
  /\bbg-neo-black\b/,
  /\btext-neo-gray-\d/,
  /\bborder-(?:3|4|neo) border-neo-(?:pink|lime)\b/,
  /\bborder-2 border-neo-lime\b/,
  /\bbg-neo-cyan\b/,
];

describe('Pro upsell surfaces share one neo look', () => {
  it.each(PRO_SURFACES)('%s has no off-brand Pro styling', (file) => {
    const src = readFileSync(resolve(ROOT, file), 'utf8');
    for (const re of OFF_BRAND) expect(src, `${file} matches ${re}`).not.toMatch(re);
  });
});
