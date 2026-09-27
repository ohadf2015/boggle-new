'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { ShareParts } from './gameShareParts';

export interface LengthBar {
  len: number;
  found: number;
  total: number;
}

export interface ShareRecapCardProps {
  testId: string;
  brand: string;
  parts: ShareParts;
  longestLabel?: string;
  longestWord?: string | null;
  revealed?: boolean;
  lengthBars?: LengthBar[];
  extra?: React.ReactNode;
  onShare: () => void;
  onCopy: () => void;
  copied: boolean;
  shareLabel: string;
  copyLabel: string;
  copiedLabel: string;
  headerExtra?: React.ReactNode;
}

const BAR_TONES = [
  'bg-neo-lime',
  'bg-neo-cyan',
  'bg-neo-pink',
  'bg-neo-purple',
  'bg-neo-orange',
];

export const ShareRecapCard: React.FC<ShareRecapCardProps> = ({
  testId,
  brand,
  parts,
  longestLabel,
  longestWord,
  revealed,
  lengthBars,
  extra,
  onShare,
  onCopy,
  copied,
  shareLabel,
  copyLabel,
  copiedLabel,
  headerExtra,
}) => {
  const maxBar = Math.max(1, ...(lengthBars ?? []).map((r) => r.total));

  return (
    <m.div
      data-testid={testId}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="relative overflow-hidden bg-neo-navy border-3 border-neo-black rounded-neo shadow-hard p-4 select-all"
    >
      <div className="pointer-events-none absolute -top-16 -end-10 h-40 w-40 rounded-full bg-neo-lime/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -start-8 h-32 w-32 rounded-full bg-neo-cyan/10 blur-2xl" />

      <div className="relative flex items-center justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="text-neo-lime font-black text-[11px] uppercase tracking-[0.22em]">
            {brand}
          </div>
          <div className="text-neo-white font-black text-xs uppercase tracking-widest truncate">
            {parts.header}
          </div>
        </div>
        {headerExtra}
      </div>

      <div className="relative mb-4">
        <div className="text-neo-lime font-black text-4xl leading-none tabular-nums tracking-tight">
          {parts.score}
        </div>
        <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
          {parts.scoreLabel}
        </div>
      </div>

      {parts.stats.length > 0 && (
        <div className="relative grid grid-cols-2 gap-2 mb-4">
          {parts.stats.map((stat) => (
            <div
              key={`${stat.label}-${stat.value}`}
              className="rounded-neo border-2 border-neo-black bg-neo-navy-light px-3 py-2"
            >
              <div className="text-neo-white font-black text-lg leading-none tabular-nums">
                {stat.value}
              </div>
              <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1 truncate">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {longestWord ? (
        <div className="relative mb-4">
          {longestLabel ? (
            <div className="text-[10px] font-black uppercase tracking-widest text-neo-lime mb-1.5">
              {longestLabel}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-1" data-testid="share-letter-tiles">
            {Array.from(longestWord).map((ch, i) => (
              <span
                key={`${ch}-${i}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-sm border-2 border-neo-black bg-neo-lime text-neo-black font-black text-sm uppercase shadow-hard-sm"
              >
                {revealed ? ch : '·'}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {lengthBars && lengthBars.length > 0 ? (
        <div data-testid="lexiclash-length-bars" className="relative space-y-1.5 mb-4">
          {lengthBars.map((row, i) => {
            const pct = Math.max(10, Math.round((row.found / maxBar) * 100));
            return (
              <div key={`len-${row.len}`} className="flex items-center gap-2">
                <span className="w-5 text-[10px] font-black text-slate-400 tabular-nums">
                  {row.len}
                </span>
                <div className="flex-1 h-2.5 rounded-sm bg-neo-navy-light overflow-hidden border-2 border-neo-black">
                  <div
                    className={`h-full ${BAR_TONES[i % BAR_TONES.length]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 text-[10px] font-bold text-slate-400 tabular-nums text-end">
                  {row.found}/{row.total}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      {extra}

      {parts.details.length > 0 && !longestWord ? (
        <div className="relative space-y-0.5 mb-3 text-xs font-bold text-slate-300">
          {parts.details.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      ) : null}

      <div className="relative border-t-2 border-neo-black pt-2 mt-1 mb-3">
        <div className="text-slate-500 text-[11px] font-black uppercase tracking-[0.18em]">
          lexiclash.live
        </div>
      </div>

      <div className="relative flex gap-2 select-none">
        <Button
          onClick={onShare}
          size="sm"
          className="flex-1 py-2.5 bg-neo-cyan text-neo-black border-2 border-neo-black rounded-neo shadow-hard-sm font-black text-xs uppercase hover:shadow-hard transition-all"
        >
          {shareLabel}
        </Button>
        <Button
          onClick={onCopy}
          size="sm"
          aria-label={copied ? copiedLabel : copyLabel}
          className="flex-1 py-2.5 bg-neo-navy-light text-white border-2 border-neo-black rounded-neo shadow-hard-sm text-xs uppercase font-black hover:shadow-hard transition-all"
        >
          {copied ? copiedLabel : copyLabel}
        </Button>
      </div>
    </m.div>
  );
};
