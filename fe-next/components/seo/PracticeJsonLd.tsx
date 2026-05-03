import type { ReactNode } from 'react';

const SITE_URL = 'https://www.lexiclash.live';
const BACKSLASH = String.fromCharCode(92);
const LINE_SEP = String.fromCharCode(0x2028);
const PARA_SEP = String.fromCharCode(0x2029);

type PracticeMode = 'classic' | 'wordHunt' | 'wheelRush';

interface PracticeModeJsonLdProps {
  mode: PracticeMode;
  locale: string;
}

interface PracticeHubJsonLdProps {
  locale: string;
}

const PRACTICE_MODE_DATA: Record<PracticeMode, {
  name: string;
  description: string;
  totalTime: string;
  steps: Array<{ name: string; text: string }>;
}> = {
  classic: {
    name: 'How to Practice Classic Word Search in LexiClash',
    description: 'Stress-free tutorial for classic boggle-style word search. Learn to chain adjacent letters into words at your own pace, with no timer and built-in coaching tips.',
    totalTime: 'PT5M',
    steps: [
      { name: 'Open Practice Mode', text: 'Navigate to /practice/classic. The board loads with no timer and no scoreboard pressure — pure exploration.' },
      { name: 'Find Adjacent Letters', text: 'Tap or drag across letters that touch each other horizontally, vertically, or diagonally to chain them into a word.' },
      { name: 'Read the Coaching Tip', text: 'A coach card shows hints contextual to the current board: prefix tips, common letter pairings, length-bonus reminders.' },
      { name: 'Submit Words at Your Pace', text: 'No clock. Submit valid words to grow your list. Invalid words shake gently with a hint, no penalty.' },
      { name: 'Move to Word Hunt', text: 'When ready, the next-mode CTA points you to /practice/wordHunt to learn longer-word strategies.' },
    ],
  },
  wordHunt: {
    name: 'How to Practice Word Hunt in LexiClash',
    description: 'Tutorial for the Word Hunt daily mode. Learn to spot longer words, chain bonus tiles, and build score combos with built-in coaching, no timer, no penalty.',
    totalTime: 'PT5M',
    steps: [
      { name: 'Open Word Hunt Practice', text: 'Navigate to /practice/wordHunt. Same board mechanics as the daily challenge, but with no clock.' },
      { name: 'Look for Longer Words First', text: 'Coach prompts highlight uncommon prefixes (un-, re-, pre-) and rare suffixes (-tion, -ment, -ness) that unlock high-score words.' },
      { name: 'Use Bonus Tiles', text: 'Bonus letters glow on the board. Coach hints flag when forming a word through a bonus tile multiplies the score.' },
      { name: 'Build Combos', text: 'Submit consecutive valid words quickly to learn the combo timing window before applying it in the timed daily.' },
      { name: 'Graduate to Word Wheel', text: 'When confident, the CTA routes you to /practice/wheelRush for anagram-wheel practice.' },
    ],
  },
  wheelRush: {
    name: 'How to Practice Word Wheel (Anagrams) in LexiClash',
    description: 'Anagram-wheel tutorial. Learn the rotating-letter puzzle mechanic with coach prompts that reveal hidden bonus words and pangram opportunities, no timer.',
    totalTime: 'PT5M',
    steps: [
      { name: 'Open Word Wheel Practice', text: 'Navigate to /practice/wheelRush. Letters arrange in a wheel; the center letter is mandatory in every word you form.' },
      { name: 'Form Words With the Center Letter', text: 'Tap the center letter plus 2+ outer letters. The word must use only letters shown on the wheel; each outer letter once per word.' },
      { name: 'Hunt for Pangrams', text: 'A pangram uses all wheel letters at once. Coach card flags when a pangram is possible and gives a length hint.' },
      { name: 'Discover Hidden Bonus Words', text: 'Some valid words trigger a bonus reveal. Coach prompts teach which letter clusters unlock bonus tiers.' },
      { name: 'Return to Practice Hub', text: 'After mastering all 3 modes, the CTA returns to /practice for the full mode overview.' },
    ],
  },
};

/**
 * Replace HTML-significant chars with JSON \uXXXX escapes so the result
 * is safe inside a <script> as a React text child (no dangerouslySetInnerHTML).
 * JSON parsers decode the escapes transparently.
 */
function encodeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, BACKSLASH + 'u003c')
    .replace(/>/g, BACKSLASH + 'u003e')
    .replace(/&/g, BACKSLASH + 'u0026')
    .replace(new RegExp(LINE_SEP, 'g'), BACKSLASH + 'u2028')
    .replace(new RegExp(PARA_SEP, 'g'), BACKSLASH + 'u2029');
}

/**
 * HowTo + LearningResource JSON-LD for a specific practice mode.
 * Server-rendered so AI crawlers (GPTBot, ClaudeBot, PerplexityBot) and
 * search bots (Googlebot, Bingbot) get structured data without executing JS.
 */
export function PracticeModeJsonLd({ mode, locale }: PracticeModeJsonLdProps): ReactNode {
  const data = PRACTICE_MODE_DATA[mode];
  const url = `${SITE_URL}/${locale}/practice/${mode}`;

  const schemas: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: data.name,
      description: data.description,
      totalTime: data.totalTime,
      tool: { '@type': 'HowToTool', name: 'Web browser' },
      supply: { '@type': 'HowToSupply', name: 'Internet connection' },
      url,
      step: data.steps.map((step, i) => ({
        '@type': 'HowToStep',
        name: step.name,
        text: step.text,
        position: i + 1,
        url: `${url}#step-${i + 1}`,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      name: data.name,
      description: data.description,
      educationalLevel: 'beginner',
      learningResourceType: 'Tutorial',
      isAccessibleForFree: true,
      inLanguage: locale,
      url,
      teaches: `${mode} word game mechanics`,
    },
  ];

  return (
    <script type="application/ld+json">{encodeJsonLd(schemas)}</script>
  );
}

/**
 * Course-style JSON-LD for the practice hub (/practice).
 * Frames the 3 practice modes as a self-paced course of tutorials.
 */
export function PracticeHubJsonLd({ locale }: PracticeHubJsonLdProps): ReactNode {
  const url = `${SITE_URL}/${locale}/practice`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: 'LexiClash Word Game Practice — Self-Paced Tutorials',
    description: 'Free self-paced tutorial covering 3 word game modes: classic word search, word hunt, and anagram word wheel. No timer, in-game coaching tips, beginner-friendly.',
    provider: {
      '@type': 'Organization',
      name: 'LexiClash',
      url: SITE_URL,
    },
    isAccessibleForFree: true,
    educationalLevel: 'beginner',
    inLanguage: locale,
    url,
    hasCourseInstance: (['classic', 'wordHunt', 'wheelRush'] as const).map((mode) => ({
      '@type': 'CourseInstance',
      name: PRACTICE_MODE_DATA[mode].name,
      courseMode: 'online',
      url: `${SITE_URL}/${locale}/practice/${mode}`,
      inLanguage: locale,
    })),
  };

  return (
    <script type="application/ld+json">{encodeJsonLd(schema)}</script>
  );
}
