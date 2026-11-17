import React from 'react';
import type { ConnectionsLandingCopy } from '@/app/[locale]/connections/content';

interface Props {
  copy: ConnectionsLandingCopy['howTo'];
}

const STEP_BG = ['bg-neo-lime', 'bg-neo-cyan', 'bg-neo-pink'];

const WORD_CHIP =
  'rounded-neo border-2 border-neo-black px-2 py-1 font-neo-display text-sm font-black uppercase';

export default function ConnectionsHowTo({ copy }: Props): React.JSX.Element {
  return (
    <section id="how-it-works" className="mx-auto max-w-4xl scroll-mt-20 px-4 py-10 sm:px-6 lg:px-8">
      <h2 className="mb-6 font-neo-display text-2xl font-black sm:text-3xl">{copy.heading}</h2>

      <ol className="mb-8 grid gap-3 sm:grid-cols-3">
        {copy.steps.map((step, i) => (
          <li
            key={step}
            className="flex items-start gap-3 rounded-neo border-3 border-neo-black bg-neo-navy-light p-4 shadow-hard"
          >
            <span
              aria-hidden="true"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black font-neo-display text-base font-black text-neo-navy shadow-hard-sm ${STEP_BG[i] ?? 'bg-neo-lime'}`}
            >
              {i + 1}
            </span>
            <span className="text-sm leading-relaxed text-neo-gray-200">{step}</span>
          </li>
        ))}
      </ol>

      <h3 className="mb-3 font-neo-display text-lg font-black">{copy.examplesLabel}</h3>
      <ul className="grid gap-3 sm:grid-cols-3">
        {copy.examples.map((ex) => (
          <li
            key={`${ex.word1}-${ex.bridge}-${ex.word2}`}
            className="flex flex-col gap-3 rounded-neo border-3 border-neo-black bg-neo-navy-light p-4 shadow-hard"
          >
            <span className="flex flex-wrap items-center justify-center gap-1.5">
              <span className={`${WORD_CHIP} bg-neo-cream text-neo-navy`}>{ex.word1}</span>
              <span className={`${WORD_CHIP} bg-neo-yellow text-neo-navy`}>{ex.bridge}</span>
              <span className={`${WORD_CHIP} bg-neo-cream text-neo-navy`}>{ex.word2}</span>
            </span>
            <span className="flex flex-wrap items-center justify-center gap-2 text-sm text-neo-gray-200">
              <span>{ex.left}</span>
              <span aria-hidden="true" className="text-neo-gray-300">·</span>
              <span>{ex.right}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
