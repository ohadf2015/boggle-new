import React from 'react';
import Link from 'next/link';
import { Layers, Pyramid, Trophy, Users } from 'lucide-react';
import type { ConnectionsLandingCopy, ConnectionsModeKey } from '@/app/[locale]/connections/content';

interface Props {
  locale: string;
  copy: ConnectionsLandingCopy['modes'];
}

const STYLE: Record<ConnectionsModeKey, { icon: typeof Layers; accent: string }> = {
  play: { icon: Layers, accent: 'bg-neo-lime' },
  daily: { icon: Trophy, accent: 'bg-neo-yellow' },
  pyramid: { icon: Pyramid, accent: 'bg-neo-purple' },
  community: { icon: Users, accent: 'bg-neo-pink' },
};

export default function ConnectionsModes({ locale, copy }: Props): React.JSX.Element {
  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h2 className="mb-6 font-neo-display text-2xl font-black sm:text-3xl">{copy.heading}</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {copy.items.map((mode) => {
          const { icon: Icon, accent } = STYLE[mode.key];
          return (
            <li key={mode.key}>
              <Link
                href={`/${locale}/connections/${mode.key}`}
                className="flex h-full items-start gap-3 rounded-neo border-3 border-neo-black bg-neo-navy-light p-4 shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <span
                  aria-hidden="true"
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black shadow-hard-sm ${accent}`}
                >
                  <Icon className="h-5 w-5 text-neo-navy" strokeWidth={2.5} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-neo-display text-lg font-black text-neo-white">{mode.title}</span>
                  <span className="text-sm leading-relaxed text-neo-gray-200">{mode.body}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
