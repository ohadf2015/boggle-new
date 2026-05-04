'use client';

import { memo } from 'react';
import { Button } from '@/components/ui/button';

export interface WordCraftControlsProps {
  canSubmit: boolean;
  canRecall: boolean;
  canSwap: boolean;
  disabled: boolean;
  onSubmit: () => void;
  onRecall: () => void;
  onPass: () => void;
  onSwap: () => void;
  labels: {
    submit: string;
    recall: string;
    pass: string;
    swap: string;
  };
}

function WordCraftControlsImpl({
  canSubmit,
  canRecall,
  canSwap,
  disabled,
  onSubmit,
  onRecall,
  onPass,
  onSwap,
  labels,
}: WordCraftControlsProps) {
  return (
    <div className="flex gap-2 flex-wrap justify-center">
      <Button onClick={onSubmit} disabled={disabled || !canSubmit} className="bg-neo-lime text-neo-navy hover:bg-neo-lime-light">
        {labels.submit}
      </Button>
      <Button variant="outline" onClick={onRecall} disabled={disabled || !canRecall}>
        {labels.recall}
      </Button>
      <Button variant="outline" onClick={onPass} disabled={disabled}>
        {labels.pass}
      </Button>
      <Button variant="outline" onClick={onSwap} disabled={disabled || !canSwap}>
        {labels.swap}
      </Button>
    </div>
  );
}

export const WordCraftControls = memo(WordCraftControlsImpl);
