// Jest mock for @remotion/transitions
import React from 'react';

const TransitionSeriesBase = ({ children, ...props }: any) =>
  React.createElement('div', { 'data-testid': 'transition-series', ...props }, children);

TransitionSeriesBase.Sequence = ({ children, ...props }: any) =>
  React.createElement('div', { 'data-testid': 'transition-sequence', ...props }, children);

export const TransitionSeries = TransitionSeriesBase;
export const linearTiming = () => ({ getDurationInFrames: () => 30 });
