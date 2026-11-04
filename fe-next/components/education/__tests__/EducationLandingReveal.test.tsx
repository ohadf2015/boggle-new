import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { motionPref } from '../motion/__tests__/reducedMotion.mock';
import { EducationLandingReveal } from '../EducationLandingReveal';

vi.unmock('framer-motion');

beforeEach(() => {
  motionPref.reduced = false;
});

describe('EducationLandingReveal', () => {
  it('waits below the fold offset by a transform only, so the section is readable before it settles', () => {
    render(<EducationLandingReveal><p>edu.section</p></EducationLandingReveal>);
    const box = screen.getByTestId('edu-landing-reveal');
    expect(box.style.transform).toMatch(/translateY\(\d+px\)/);
    expect(box.style.opacity).toBe('');
    expect(screen.getByText('edu.section')).toBeInTheDocument();
  });

  it('renders at rest under reduced motion', () => {
    motionPref.reduced = true;
    render(<EducationLandingReveal><p>edu.section</p></EducationLandingReveal>);
    expect(screen.getByTestId('edu-landing-reveal').style.transform).not.toMatch(/translateY/);
  });

  it('keeps one element across a reduced-motion flip so the section never remounts', () => {
    const { rerender } = render(<EducationLandingReveal><p>edu.section</p></EducationLandingReveal>);
    const before = screen.getByTestId('edu-landing-reveal');
    motionPref.reduced = true;
    rerender(<EducationLandingReveal><p>edu.section</p></EducationLandingReveal>);
    expect(screen.getByTestId('edu-landing-reveal')).toBe(before);
  });
});
