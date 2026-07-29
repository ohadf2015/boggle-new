// Jest mock for @remotion/transitions
import React from 'react';

const TransitionSeriesBase = ({ children, ...props }: any) =>
  React.createElement('div', { 'data-testid': 'transition-series', ...props }, children);
TransitionSeriesBase.displayName = 'TransitionSeries';

const Sequence = ({ children, ...props }: any) =>
  React.createElement('div', { 'data-testid': 'transition-sequence', ...props }, children);
Sequence.displayName = 'TransitionSeries.Sequence';
TransitionSeriesBase.Sequence = Sequence;

export const TransitionSeries = TransitionSeriesBase;
export const linearTiming = () => ({ getDurationInFrames: () => 30 });
