/**
 * The projector is very often the teacher's OWN screen, mirrored — and just as
 * often that screen is a phone held in one hand while the laptop drives the
 * beamer. So the same component has to survive 360px.
 *
 * The failure this guards is the classic one for a two-up layout: someone adds
 * an unprefixed `grid-cols-2` to sit the QR beside the code, it looks right on
 * the 1080p wall, and on the teacher's phone the code and the QR each get half
 * of 360px and both become unreadable. The panel must be a single column until
 * `md`.
 *
 * jsdom has no layout engine, so nothing here measures anything — these are
 * class-presence guards on the exact tokens that decide the phone case.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import ProjectorJoinPanel from '../ProjectorJoinPanel';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const props = {
  gameCode: 'GHYRVS',
  language: 'en',
  baseUrl: 'https://www.lexiclash.live',
  t,
};

describe('ProjectorJoinPanel — the teacher’s phone', () => {
  it('stacks the code above the QR on a phone, side by side only from md up', () => {
    render(<ProjectorJoinPanel {...props} />);
    const panel = screen.getByTestId('projector-join-panel');
    // Two columns must be an md-and-up decision, never the base layout.
    expect(panel.className).toContain('md:grid-cols-');
    expect(panel.className).not.toMatch(/(^|\s)grid-cols-/);
  });

  it('gives the code a phone size AND a projector size, never one for both', () => {
    render(<ProjectorJoinPanel {...props} />);
    const code = screen.getByTestId('projector-code');
    // Back-row requirement: at least 12vw once the projector breakpoint is on.
    const projector = code.className.match(/md:text-\[min\(([\d.]+)vw,/);
    expect(projector).not.toBeNull();
    expect(Number(projector![1])).toBeGreaterThanOrEqual(12);
    // …and a distinct base size, because 12vw of a phone is unreadably small.
    expect(code.className).toMatch(/(^|\s)text-\[min\([\d.]+vw,/);
  });

  it('caps the code and the QR against the viewport HEIGHT, not only its width', () => {
    // The teacher's mirrored screen is routinely 1280x630 of usable page — a
    // laptop window, not a 16:9 wall. Sized in `vw` alone, the code and the QR
    // keep their full width-derived height there, eat the roster's share of a
    // short viewport, and the names the class came to see get squeezed out.
    // Every vertically expensive element therefore carries a `vh` ceiling.
    render(<ProjectorJoinPanel {...props} />);
    expect(screen.getByTestId('projector-code').className).toContain('vh');
    const qr = screen.getByTestId('projector-qr').querySelector('svg');
    expect(qr!.getAttribute('class') || '').toContain('vh');
  });

  it('lets the code row scroll rather than clip a character off a narrow phone', () => {
    render(<ProjectorJoinPanel {...props} />);
    const code = screen.getByTestId('projector-code');
    expect(code.className).toContain('max-w-full');
    expect(screen.getAllByTestId('projector-code-char')).toHaveLength(6);
  });

  it('keeps the QR readable on a phone with a floor, and capped so it cannot eat the screen', () => {
    render(<ProjectorJoinPanel {...props} />);
    const qr = screen.getByTestId('projector-qr').querySelector('svg');
    expect(qr).not.toBeNull();
    expect(qr!.getAttribute('class') || '').toMatch(/min-w-\[\d+px\]/);
  });
});
