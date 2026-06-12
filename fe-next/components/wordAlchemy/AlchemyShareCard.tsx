'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { type StepResult, buildAlchemyShareText, stepEmoji, deriveScore } from '@/lib/wordAlchemy/alchemyShare';

interface AlchemyShareCardProps {
  stepResults: StepResult[];
  puzzleNumber: number;
}

function deriveCaption(steps: StepResult[], t: (k: string) => string): string {
  const score = deriveScore(steps);
  const perfect = steps.length > 0 && steps.every((s) => !s.wild && s.attempts === 0);
  const hasWild = steps.some((s) => s.wild);
  if (perfect) return t('wordAlchemy.share.captionPerfect');
  if (hasWild) return t('wordAlchemy.share.captionWild');
  if (score >= steps.length * 70) return t('wordAlchemy.share.captionGood');
  return t('wordAlchemy.share.captionHard');
}

export function AlchemyShareCard({ stepResults, puzzleNumber }: AlchemyShareCardProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const emojiRow = stepResults.map(stepEmoji).join('');
  const score = deriveScore(stepResults);
  const caption = deriveCaption(stepResults, t);

  const handleCopy = async () => {
    const text = buildAlchemyShareText(stepResults, puzzleNumber);
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      /* focus-guard: clipboard may be unavailable in non-secure contexts */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-neo border-3 border-black bg-neo-navy p-4 shadow-hard space-y-3 text-center">
      <p className="font-neo-display font-black text-2xl tracking-widest text-neo-white" aria-label={t('wordAlchemy.share.emojiRowAria')}>
        {emojiRow}
      </p>
      <p className="font-neo-body text-sm text-neo-white/80">
        {score}pts · {caption}
      </p>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-2 rounded-neo border-2 border-black bg-neo-purple px-4 py-2 font-neo-display font-black text-xs uppercase tracking-wide text-neo-navy shadow-hard-sm transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:animate-neo-press motion-reduce:active:animate-none"
        aria-label={copied ? t('wordAlchemy.share.copied') : t('wordAlchemy.share.copy')}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
        )}
        {copied ? t('wordAlchemy.share.copied') : t('wordAlchemy.share.copy')}
      </button>
    </div>
  );
}
