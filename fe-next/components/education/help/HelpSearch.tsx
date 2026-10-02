'use client';

import { useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { searchHelp, type HelpSearchEntry } from './helpSearchIndex';

export interface HelpSearchItem extends HelpSearchEntry {
  href: string;
}

export function HelpSearch({
  index,
  label,
  placeholder,
  noResults,
  resultsTemplate,
}: {
  index: HelpSearchItem[];
  label: string;
  placeholder: string;
  noResults: string;
  /** Contains `{count}`. */
  resultsTemplate: string;
}) {
  const router = useRouter();
  const id = useId();
  const [query, setQuery] = useState('');
  const hits = useMemo(() => searchHelp(index, query) as HelpSearchItem[], [index, query]);
  const active = query.trim().length > 0;

  return (
    <div className="relative">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (hits[0]) router.push(hits[0].href);
        }}
      >
        <label htmlFor={`${id}-q`} className="sr-only">
          {label}
        </label>
        <div className="flex items-center gap-3 rounded-neo border-4 border-neo-black bg-neo-cream px-4 shadow-hard-xl focus-within:ring-4 focus-within:ring-neo-cyan">
          <Search aria-hidden="true" className="size-6 shrink-0 text-neo-navy" />
          <input
            id={`${id}-q`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setQuery('');
            }}
            placeholder={placeholder}
            autoComplete="off"
            aria-controls={`${id}-results`}
            style={{ outline: 'none' }}
            className="h-16 w-full min-w-0 bg-transparent font-neo-body text-lg font-semibold text-neo-navy placeholder:text-neo-navy/55 focus:outline-none"
          />
        </div>
      </form>
      <div id={`${id}-results`} aria-live="polite">
        {active ? (
          <div className="mt-3 rounded-neo border-4 border-neo-cream/50 bg-neo-navy-light p-2 shadow-hard-lg">
            {hits.length === 0 ? (
              <p className="p-3 text-neo-gray-200">{noResults}</p>
            ) : (
              <>
                <p className="px-3 pb-1 pt-2 text-xs font-black uppercase tracking-widest text-neo-gray-300">
                  {resultsTemplate.replace('{count}', String(hits.length))}
                </p>
                <ul>
                  {hits.map((h) => (
                    <li key={h.slug}>
                      <Link
                        href={h.href}
                        className="group flex items-center gap-3 rounded-[6px] px-3 py-3 hover:bg-neo-navy focus-visible:bg-neo-navy"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-neo-display text-lg font-bold text-neo-white group-hover:text-neo-lime">
                            {h.title}
                          </span>
                          <span className="block truncate text-sm text-neo-gray-300">
                            {h.category} · {h.summary}
                          </span>
                        </span>
                        <DirectionalIcon icon={ArrowRight} className="size-5 shrink-0 text-neo-cyan" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
