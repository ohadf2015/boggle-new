import React from 'react';
import { BookOpen, Brain, Zap } from 'lucide-react';
import type { ConnectionsLandingCopy } from '@/app/[locale]/connections/content';

interface Props {
  copy: ConnectionsLandingCopy['why'];
}

const ICONS = [BookOpen, Brain, Zap];
const ACCENTS = ['bg-neo-lime', 'bg-neo-purple', 'bg-neo-cyan'];

export default function ConnectionsWhyPlay({ copy }: Props): React.JSX.Element {
  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h2 className="mb-6 font-neo-display text-2xl font-black sm:text-3xl">{copy.heading}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {copy.cards.map((card, i) => (
          <div
            key={card.title}
            className="rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard"
          >
            <div
              className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-neo border-3 border-neo-black text-2xl shadow-hard-sm ${ACCENTS[i] ?? 'bg-neo-lime'}`}
              aria-hidden
            >
              {React.createElement(ICONS[i] ?? Zap, { className: 'h-6 w-6 text-neo-navy', strokeWidth: 2.5 })}
            </div>
            <h3 className="mb-2 font-neo-display text-lg font-black">{card.title}</h3>
            <p className="text-sm leading-relaxed text-neo-gray-200">{card.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
