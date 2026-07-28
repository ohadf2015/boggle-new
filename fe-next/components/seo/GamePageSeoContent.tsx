import React from 'react';
import { cn } from '@/lib/utils';

interface GamePageSeoContentProps {
  title: string;
  description: string;
  features?: string[];
  faq?: Array<{ question: string; answer: string }>;
  /** When true, render an h1 instead of h2 (only for pages without their own visible h1) */
  asH1?: boolean;
  /** When true, wrap the whole card in a native <details> collapsed by default.
   *  Use on game screens (/daily, /multiplayer, /singleplayer) where players
   *  came to play, not to read marketing copy: the full text stays in the DOM
   *  for AdSense reviewers and crawlers (no hidden-text signal), but the card
   *  no longer shoves the game below the fold. (Player feedback, 2026-07-28) */
  collapsible?: boolean;
  /** Escape hatch: keep the old visually-hidden rendering for pages whose design
   *  cannot host a visible reference block (e.g. the 3D showcase landing). */
  srOnly?: boolean;
}

/**
 * Localized SEO/GEO content for game pages.
 *
 * HISTORY: this used to render `sr-only` (visually hidden) copy — indexable by
 * crawlers but invisible to humans. After repeated AdSense "Low value content"
 * rejections we flipped the default to VISIBLE (2026-07-27): a calm, readable
 * neo-brutalist reference card at the bottom of each page, matching the
 * HomepageContentSection pattern that remediated the homepage on 2026-06-04.
 *
 * Visible-by-default means: (a) human AdSense reviewers actually see publisher
 * content on app-shell pages, (b) no hidden-text signal for Google's spam
 * systems, (c) genuine UX value for players who scroll for rules/answers.
 *
 * Server component — the FAQ uses native <details>/<summary> so it is fully
 * interactive with zero client JS and present in the SSR HTML. RTL (Hebrew)
 * flips automatically via document direction and symmetric spacing.
 */
export function GamePageSeoContent({
  title,
  description,
  features = [],
  faq = [],
  asH1 = false,
  collapsible = false,
  srOnly = false,
}: GamePageSeoContentProps) {
  const Heading = asH1 ? 'h1' : 'h2';

  if (srOnly) {
    return (
      <section className="sr-only" aria-label={title}>
        <Heading>{title}</Heading>
        <p>{description}</p>
        {features.length > 0 && (
          <ul>
            {features.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        )}
        {faq.length > 0 && (
          <div>
            {faq.map((item, i) => (
              <div key={i}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  const body = (
    <>
      <p className="mb-8 max-w-prose text-sm leading-relaxed text-neo-cream/90 sm:text-base">
        {description}
      </p>

      {features.length > 0 && (
        <ul className="mb-8 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
          {features.map((f, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-neo border-2 border-neo-black bg-neo-navy px-3 py-2 text-sm leading-snug text-neo-cream/90 shadow-hard-sm"
            >
              <span aria-hidden className="mt-0.5 shrink-0 font-black text-neo-lime">
                ▪
              </span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}

      {faq.length > 0 && (
        <div className="space-y-2">
          {faq.map((item, i) => (
            <details
              key={i}
              className="group rounded-neo border-2 border-neo-black bg-neo-navy shadow-hard-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 font-neo-display font-bold text-neo-white marker:hidden sm:p-4">
                <span>{item.question}</span>
                <span
                  aria-hidden
                  className="shrink-0 font-black text-neo-pink transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="px-3 pb-3 text-sm leading-relaxed text-neo-cream/90 sm:px-4 sm:pb-4">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      )}
    </>
  );

  if (collapsible) {
    // Accordion variant for game screens: title stays visible as the toggle
    // label (heading preserved inside <summary>, valid per WHATWG), the rest
    // of the copy sits one tap away. Named group `card` so the FAQ accordions
    // nested inside don't inherit the outer open-state rotation.
    return (
      <section
        aria-label={title}
        className="mx-auto mt-4 w-full max-w-4xl px-4 pb-12 pt-10 font-neo-body text-neo-white"
      >
        <details className="group/card rounded-neo border-3 border-neo-black bg-neo-navy-light/60 shadow-hard">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 marker:hidden sm:p-6 [&::-webkit-details-marker]:hidden">
            <Heading
              className={cn(
                'm-0 font-neo-display font-black text-neo-white text-balance',
                asH1 ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'
              )}
            >
              {title}
            </Heading>
            <span
              aria-hidden
              className="shrink-0 font-black text-neo-pink transition-transform duration-200 group-open/card:rotate-45"
            >
              +
            </span>
          </summary>
          <div className="px-4 pb-6 sm:px-6 sm:pb-8">{body}</div>
        </details>
      </section>
    );
  }

  return (
    <section
      aria-label={title}
      className="mx-auto mt-4 w-full max-w-4xl px-4 pb-12 pt-10 font-neo-body text-neo-white"
    >
      <div className="rounded-neo border-3 border-neo-black bg-neo-navy-light/60 p-6 shadow-hard sm:p-8">
        <Heading
          className={cn(
            'mb-3 font-neo-display font-black text-neo-white text-balance',
            asH1 ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'
          )}
        >
          {title}
        </Heading>
        {body}
      </div>
    </section>
  );
}
