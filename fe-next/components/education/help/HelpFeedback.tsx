'use client';

import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import lazyPosthog from '@/lib/analytics/lazyPosthog';

export function HelpFeedback({
  slug,
  question,
  yes,
  no,
  thanks,
  thanksNo,
}: {
  slug: string;
  question: string;
  yes: string;
  no: string;
  thanks: string;
  thanksNo: string;
}) {
  const [answer, setAnswer] = useState<'yes' | 'no' | null>(null);
  const vote = (helpful: 'yes' | 'no') => {
    setAnswer(helpful);
    lazyPosthog.capture('help_article_feedback', { slug, helpful: helpful === 'yes' });
  };

  return (
    <div className="mt-10 flex min-h-16 flex-wrap items-center gap-3 border-t-4 border-neo-black pt-6" aria-live="polite">
      {answer ? (
        <p className="font-bold text-neo-lime">{answer === 'yes' ? thanks : thanksNo}</p>
      ) : (
        <>
          <p className="me-2 font-neo-display text-lg font-black">{question}</p>
          <button
            type="button"
            onClick={() => vote('yes')}
            className="inline-flex items-center gap-2 rounded-neo border-3 border-neo-black bg-neo-cream px-4 py-2 font-bold text-neo-navy shadow-hard hover:-translate-y-0.5"
          >
            <ThumbsUp aria-hidden="true" className="size-4" />
            {yes}
          </button>
          <button
            type="button"
            onClick={() => vote('no')}
            className="inline-flex items-center gap-2 rounded-neo border-3 border-neo-cream/50 bg-neo-navy-light px-4 py-2 font-bold text-neo-white shadow-hard hover:-translate-y-0.5"
          >
            <ThumbsDown aria-hidden="true" className="size-4" />
            {no}
          </button>
        </>
      )}
    </div>
  );
}
