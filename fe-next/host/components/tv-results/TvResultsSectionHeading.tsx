'use client';

import { memo } from 'react';
import { m } from 'framer-motion';

interface TvResultsSectionHeadingProps {
  title: string;
  quip: string;
  aside?: string;
}

/** An overflow count takes the quip's place so the heading row never wraps. */
const TvResultsSectionHeading = memo<TvResultsSectionHeadingProps>(({ title, quip, aside }) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
    <m.h3
      initial={{ x: -20 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="font-neo-display text-[clamp(1.1rem,2.4vh,1.6rem)] font-black uppercase tracking-wide text-neo-cream"
    >
      {title}
    </m.h3>
    {!aside && (
      <m.p
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="rounded-neo border-3 border-neo-black bg-neo-cream px-3 py-1 font-neo-body text-[clamp(0.8rem,1.6vh,1rem)] font-black italic text-neo-black shadow-hard-sm [@media(max-height:860px)]:hidden"
      >
        {quip}
      </m.p>
    )}
    {aside && (
      <p className="ms-auto font-neo-body text-[clamp(0.8rem,1.6vh,1rem)] font-bold text-neo-cream/70">{aside}</p>
    )}
  </div>
));

TvResultsSectionHeading.displayName = 'TvResultsSectionHeading';

export default TvResultsSectionHeading;
