import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LandingSchoolLead } from '../LandingSchoolLead';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
const formProps = vi.fn();
vi.mock('@/components/education/SchoolLeadForm', () => ({
  SchoolLeadForm: (p: Record<string, unknown>) => {
    formProps(p);
    return <form data-testid="school-lead-form" />;
  },
}));
const track = vi.fn();
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: (...a: unknown[]) => track(...a) }));

describe('LandingSchoolLead', () => {
  beforeEach(() => {
    formProps.mockClear();
    track.mockClear();
  });

  it('is a linkable section for header and hero links', () => {
    const { container } = render(<LandingSchoolLead />);
    expect(container.querySelector('section#school-quote')).not.toBeNull();
  });

  it('does not mount the form (and its view event) until the visitor asks for a quote', () => {
    render(<LandingSchoolLead />);
    expect(screen.queryByTestId('school-lead-form')).toBeNull();
    expect(formProps).not.toHaveBeenCalled();
  });

  it('opens the real school-lead form, attributed to the landing', () => {
    render(<LandingSchoolLead />);
    fireEvent.click(screen.getByTestId('landing-school-quote-open'));
    expect(screen.getByTestId('school-lead-form')).toBeInTheDocument();
    expect(formProps).toHaveBeenCalledWith(expect.objectContaining({ plan: 'school', surface: 'education_landing' }));
    expect(track).toHaveBeenCalledWith('landing_cta_clicked', { cta: 'education_school_quote' });
  });

  it('keeps a path to the full schools page', () => {
    render(<LandingSchoolLead />);
    expect(screen.getByTestId('landing-school-plans-link')).toHaveAttribute('href', '/en/education/for-schools');
  });
});
