'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FaqItem {
  question: string;
  answer: string;
}

interface GamePageSeoContentProps {
  title: string;
  description: string;
  features?: string[];
  faq?: FaqItem[];
  className?: string;
}

/**
 * Collapsible SEO content section for game pages.
 * Renders real HTML that crawlers can index, but stays collapsed
 * so it doesn't clutter the game UI. Users can expand it if curious.
 */
export function GamePageSeoContent({
  title,
  description,
  features,
  faq,
  className,
}: GamePageSeoContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section
      className={cn(
        'border-t border-white/10 bg-gradient-to-b from-transparent to-slate-900/50',
        className
      )}
    >
      <div className="max-w-3xl mx-auto px-4 py-6">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-left group"
          aria-expanded={isExpanded}
        >
          <h2 className="text-base font-medium text-white/60 group-hover:text-white/80 transition-colors">
            {title}
          </h2>
          <ChevronDown
            className={cn(
              'w-5 h-5 text-white/40 transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          />
        </button>

        <p className="mt-1.5 text-xs text-white/40 leading-relaxed">
          {description}
        </p>

        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-300 ease-in-out',
            isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          )}
        >
          <div className="overflow-hidden">
            <div className="pt-4 space-y-4">
              {features && features.length > 0 && (
                <ul className="space-y-1.5">
                  {features.map((feature, i) => (
                    <li key={i} className="text-sm text-white/50 flex items-start gap-2">
                      <span className="text-cyan-400/60 mt-0.5">&#x25B8;</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              )}

              {faq && faq.length > 0 && (
                <div className="space-y-3 pt-2">
                  {faq.map((item, i) => (
                    <div key={i}>
                      <h2 className="text-sm font-medium text-white/60">{item.question}</h2>
                      <p className="text-sm text-white/40 mt-0.5">{item.answer}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
