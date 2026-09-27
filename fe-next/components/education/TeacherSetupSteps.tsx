'use client';

/**
 * TeacherSetupSteps — the five steps a classroom actually runs through:
 * create -> share the code -> students join -> play -> read the results.
 *
 * This markup used to live inside TeacherOnboarding, which is a first-run
 * modal behind TeacherGate. That made it unreachable twice over: a teacher who
 * dismissed it once never saw it again, and a teacher still deciding whether
 * to sign up could not see it at all. It is a presentational strip now, so the
 * modal and the public /education page render the SAME five steps from one
 * source rather than drifting into two explanations of one product.
 *
 * Step testids are unchanged (`onboarding-step-<id>`) — the modal's existing
 * test asserts them.
 *
 * The entrance is CSS, not a framer-motion tween. Two reasons: this now
 * renders full-width on the public landing page, and pitfall class 5 is
 * explicit that an entrance opacity tween on a large mobile layer promotes a
 * page-sized GPU layer and flashes on the Chromium mobile renderer. It also
 * keeps a presentational strip free of a dependency that five separate
 * education tests each mock by hand, element type by element type.
 *
 * Delays are literal utility classes: Tailwind v4 only generates a class it can
 * see as a complete string, so an interpolated `delay-[${n}ms]` would compile
 * to nothing.
 */

import {
  School,
  Share2,
  Smartphone,
  Gamepad2,
  BarChart3,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface InfographicStep {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  textKey: string;
  badgeBg: string;
  /** Small pure-CSS/SVG mock illustrating the step — no external images */
  visual: React.ReactNode;
}

/** Mini phone frame showing a join code (step 2) */
function PhoneCodeVisual() {
  return (
    <div className="mx-auto w-14 rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light p-1.5 shadow-hard-sm">
      <div className="mx-auto mb-1 h-1 w-5 rounded-full bg-neo-white/30" />
      <div className="rounded-neo-sm border border-neo-black bg-neo-lime px-1 py-1.5 text-center font-mono text-[10px] font-black tracking-widest text-neo-black">
        ABC123
      </div>
    </div>
  );
}

/** Mini classroom card (step 1) */
function ClassroomCardVisual() {
  return (
    <div className="mx-auto w-20 rounded-neo border-2 border-neo-black bg-neo-cream p-1.5 shadow-hard-sm">
      <div className="mb-1 h-2 w-3/4 rounded-full bg-neo-cyan border border-neo-black" />
      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-3 w-3 rounded-full border border-neo-black bg-neo-pink" />
        ))}
      </div>
    </div>
  );
}

/** Three devices joining (step 3) */
function DevicesVisual() {
  return (
    <div className="mx-auto flex items-end justify-center gap-1">
      <div className="h-9 w-6 rounded-neo-sm border-2 border-neo-black bg-neo-cyan shadow-hard-sm" />
      <div className="h-11 w-7 rounded-neo-sm border-2 border-neo-black bg-neo-lime shadow-hard-sm" />
      <div className="h-8 w-8 rounded-neo-sm border-2 border-neo-black bg-neo-pink shadow-hard-sm" />
    </div>
  );
}

/** Mini letter grid (step 4) */
function LetterGridVisual() {
  const letters = ['W', 'O', 'R', 'D'];
  return (
    <div className="mx-auto grid w-16 grid-cols-2 gap-0.5">
      {letters.map((letter, i) => (
        <div
          key={i}
          className={cn(
            'flex h-7 items-center justify-center rounded-neo-sm border-2 border-neo-black font-neo-display text-xs font-black text-neo-black',
            i % 2 === 0 ? 'bg-neo-lime' : 'bg-neo-cyan'
          )}
        >
          {letter}
        </div>
      ))}
    </div>
  );
}

/** Mini bar chart (step 5) */
function BarChartVisual() {
  const bars = [
    { h: 'h-4', bg: 'bg-neo-cyan' },
    { h: 'h-7', bg: 'bg-neo-lime' },
    { h: 'h-10', bg: 'bg-neo-pink' },
  ];
  return (
    <div className="mx-auto flex h-11 items-end justify-center gap-1">
      {bars.map((bar, i) => (
        <div key={i} className={cn('w-4 rounded-t-neo-sm border-2 border-neo-black', bar.h, bar.bg)} />
      ))}
    </div>
  );
}

const INFOGRAPHIC_STEPS: InfographicStep[] = [
  {
    id: 'create',
    icon: School,
    titleKey: 'education.onboarding.steps.create.title',
    textKey: 'education.onboarding.steps.create.text',
    badgeBg: 'bg-neo-cyan',
    visual: <ClassroomCardVisual />,
  },
  {
    id: 'share',
    icon: Share2,
    titleKey: 'education.onboarding.steps.share.title',
    textKey: 'education.onboarding.steps.share.text',
    badgeBg: 'bg-neo-pink',
    visual: <PhoneCodeVisual />,
  },
  {
    id: 'join',
    icon: Smartphone,
    titleKey: 'education.onboarding.steps.join.title',
    textKey: 'education.onboarding.steps.join.text',
    badgeBg: 'bg-neo-lime',
    visual: <DevicesVisual />,
  },
  {
    id: 'play',
    icon: Gamepad2,
    titleKey: 'education.onboarding.steps.play.title',
    textKey: 'education.onboarding.steps.play.text',
    badgeBg: 'bg-neo-cyan',
    visual: <LetterGridVisual />,
  },
  {
    id: 'results',
    icon: BarChart3,
    titleKey: 'education.onboarding.steps.results.title',
    textKey: 'education.onboarding.steps.results.text',
    badgeBg: 'bg-neo-pink',
    visual: <BarChartVisual />,
  },
];

export const TEACHER_SETUP_STEP_IDS = INFOGRAPHIC_STEPS.map((s) => s.id);
export const TEACHER_SETUP_STEP_COUNT = INFOGRAPHIC_STEPS.length;

/**
 * `className` lets the caller own the outer spacing: the modal pads to its own
 * panel, the landing section to the page grid.
 */
const STEP_DELAY = ['delay-0', 'delay-75', 'delay-150', 'delay-200', 'delay-300'];

export function TeacherSetupSteps({ className }: { className?: string }) {
  const { t } = useLanguage();

  return (
    <ol
      className={cn(
        'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5',
        className,
      )}
    >
      {INFOGRAPHIC_STEPS.map((step, idx) => {
        const Icon = step.icon;
        return (
          <li
            key={step.id}
            data-testid={`onboarding-step-${step.id}`}
            className={cn(
              'animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards duration-300',
              'motion-reduce:animate-none',
              STEP_DELAY[idx],
              'relative flex items-center gap-4 rounded-neo border-2 border-neo-cream',
              'bg-neo-navy-light p-4 shadow-hard-sm',
              'sm:flex-col sm:items-start sm:gap-3'
            )}
          >
            {/* Number badge */}
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                'border-2 border-neo-black shadow-hard-sm',
                'font-neo-display text-lg font-black text-neo-black',
                step.badgeBg
              )}
              aria-hidden="true"
            >
              {idx + 1}
            </div>

            <div className="flex-1 sm:flex sm:w-full sm:flex-col sm:gap-2">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-neo-white" />
                <h3 className="font-neo-display text-sm font-bold text-neo-white text-balance">
                  {t(step.titleKey)}
                </h3>
              </div>
              <p className="mt-1 text-xs text-neo-white/70 font-neo-body leading-snug">
                {t(step.textKey)}
              </p>
              <div className="mt-2 hidden sm:block" aria-hidden="true">
                {step.visual}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default TeacherSetupSteps;
