import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const capture = vi.fn();
vi.mock('@/lib/education/telemetry', () => ({ safeCapture: (...a: unknown[]) => capture(...a) }));

import { JoinSheet, normalizeJoinCode, SLIPS_PER_PAGE } from '../JoinSheet';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);

describe('normalizeJoinCode', () => {
  it('accepts short alphanumeric codes, upper-cased', () => {
    expect(normalizeJoinCode(' ab12cd ')).toBe('AB12CD');
  });
  it('rejects anything that is not a class code', () => {
    for (const bad of [null, '', 'ab', 'AB12CD99X', 'AB-12', '<script>']) expect(normalizeJoinCode(bad)).toBeNull();
  });
});

describe('JoinSheet', () => {
  it('prints a page of slips, each with the code and the typed-URL fallback', () => {
    render(<JoinSheet code="AB12CD" className="5B English" origin="https://www.lexiclash.live" language="en" t={t} />);
    const slips = screen.getAllByTestId('join-slip');
    expect(slips).toHaveLength(SLIPS_PER_PAGE);
    expect(screen.getAllByTestId('join-slip-code')[0]).toHaveTextContent('AB12CD');
    expect(slips[0]).toHaveTextContent('lexiclash.live/en/join');
    expect(slips[0]).not.toHaveTextContent('www.');
    expect(slips[0]).toHaveTextContent('5B English');
    expect(slips[0].querySelector('svg')).not.toBeNull();
  });

  it('prints via the browser and records the print', () => {
    const print = vi.fn();
    Object.defineProperty(window, 'print', { value: print, configurable: true, writable: true });
    render(<JoinSheet code="AB12CD" className="5B" origin="https://x.test" language="he" t={t} />);
    fireEvent.click(screen.getByTestId('join-sheet-print'));
    expect(print).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith('edu_join_sheet_printed', { slips: SLIPS_PER_PAGE });
  });

  it('explains a missing code instead of printing empty slips', () => {
    render(<JoinSheet code={null} className="" origin="https://x.test" language="en" t={t} />);
    expect(screen.getByTestId('join-sheet-invalid')).toHaveTextContent('teacher.joinSheet.invalid');
    expect(screen.queryByTestId('join-slip')).toBeNull();
  });
});
