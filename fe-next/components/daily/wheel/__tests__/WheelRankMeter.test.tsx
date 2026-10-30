import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import WheelRankMeter from '../WheelRankMeter';

const t = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

describe('WheelRankMeter', () => {
  it('Given a mid-ladder score, When rendered, Then it marks the reached rank and names the next one', () => {
    render(<WheelRankMeter t={t} score={42} />);
    const meter = screen.getByTestId('wheel-rank-meter');
    expect(meter.getAttribute('data-rank-index')).toBe('2');
    expect(screen.getByTestId('wheel-rank-next').textContent).toContain('wordWheel.rank.toNext');
    expect(screen.getByTestId('wheel-rank-next').textContent).toContain('wordWheel.rank.sharp');
  });

  it('Given the top score, When rendered, Then it says the ladder is done instead of a next rank', () => {
    render(<WheelRankMeter t={t} score={5000} />);
    expect(screen.getByTestId('wheel-rank-next').textContent).toBe('wordWheel.rank.top');
  });

  it('Given any score, When rendered, Then the fill moves by transform, never by width', () => {
    render(<WheelRankMeter t={t} score={42} />);
    const fill = screen.getByTestId('wheel-rank-fill');
    expect(fill.getAttribute('style') ?? '').not.toMatch(/width/);
  });

  it('Given a Hebrew board, When a 900 score renders, Then it sits below Wizard on the stretched ladder', () => {
    render(<WheelRankMeter t={t} score={900} puzzleDate="2026-10-30" language="he" />);
    expect(screen.getByTestId('wheel-rank-meter').getAttribute('data-rank-index')).toBe('6');
  });
});
