/**
 * TV (2560x1440): Teacher HQ laid out at CSS px became a small island of
 * 12px chrome in a sea of art. From 2200x1200 up the teacher shell zooms by
 * 4/3, so a 2560x1440 screen lays out exactly like the tuned 1920x1080 deck,
 * just bigger. Zoom scales `dvh` too, so the shell's height drops to 75dvh
 * (x 4/3 = the full screen) and the page still never scrolls.
 */
import { describe, it, expect } from 'vitest';
import { TEACHER_TV_SCALE } from '../tvScale';

const TV = '[@media(min-width:2200px)_and_(min-height:1200px)]:';

describe('TEACHER_TV_SCALE', () => {
  it('Given a TV-sized screen, Then the shell zooms by 4/3', () => {
    expect(TEACHER_TV_SCALE).toContain(`${TV}[zoom:1.3333]`);
  });
  it('Given the zoom, Then the height is compensated so the shell is exactly one screen', () => {
    expect(TEACHER_TV_SCALE).toContain(`${TV}h-[75dvh]`);
  });
  it('Given a 1920x1080 desktop, Then nothing applies (only TV-gated classes)', () => {
    for (const cls of TEACHER_TV_SCALE.split(/\s+/)) expect(cls.startsWith(TV)).toBe(true);
  });
});
