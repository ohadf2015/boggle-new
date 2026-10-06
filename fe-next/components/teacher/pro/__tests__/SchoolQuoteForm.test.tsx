import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
    language: 'he',
  }),
}));
const track = vi.fn();
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: (...a: unknown[]) => track(...a) }));

import { SchoolQuoteForm } from '../SchoolQuoteForm';

function fill() {
  fireEvent.change(screen.getByLabelText('eg2Pro.school.fieldName'), { target: { value: 'Dana Levi' } });
  fireEvent.change(screen.getByLabelText('eg2Pro.school.fieldEmail'), { target: { value: 'dana@school.org' } });
  fireEvent.change(screen.getByLabelText('eg2Pro.school.fieldSchool'), { target: { value: 'Herzl High' } });
  fireEvent.change(screen.getByLabelText('eg2Pro.school.fieldTeachers'), { target: { value: '7' } });
}

describe('SchoolQuoteForm', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    track.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('keeps submit disabled until name, email and school are valid', () => {
    render(<SchoolQuoteForm requester="" />);
    const submit = screen.getByRole('button', { name: 'eg2Pro.school.submit' });
    expect(submit).toBeDisabled();
    fill();
    expect(submit).not.toBeDisabled();
  });

  it('posts a validated lead to the existing school-lead route and confirms by email', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
    render(<SchoolQuoteForm requester="Ms Rivera" />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'eg2Pro.school.submit' }));
    await waitFor(() => expect(screen.getByTestId('school-quote-success')).toBeInTheDocument());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/education/school-lead');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ email: 'dana@school.org', school_or_district: 'Herzl High', locale: 'he', source: 'teacher-upgrade' });
    expect(body.message).toContain('Ms Rivera');
    expect(body.message).toContain('7');
    expect(screen.getByTestId('school-quote-success').textContent).toContain('dana@school.org');
    expect(track).toHaveBeenCalledWith('school_lead_submitted', expect.objectContaining({ plan: 'school' }));
  });

  it('says so plainly when the 24h limit is hit', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, json: async () => ({ ok: false }) });
    render(<SchoolQuoteForm requester="" />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'eg2Pro.school.submit' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('eg2Pro.school.errorRateLimited'));
  });

  it('shows the requester banner only when someone asked', () => {
    const { rerender } = render(<SchoolQuoteForm requester="" />);
    expect(screen.queryByTestId('school-quote-requester')).not.toBeInTheDocument();
    rerender(<SchoolQuoteForm requester="Ms Rivera" />);
    expect(screen.getByTestId('school-quote-requester').textContent).toContain('Ms Rivera');
  });

  it('shows a live annual estimate from the teacher count, only at or above the minimum', () => {
    render(<SchoolQuoteForm requester="" />);
    const teachers = screen.getByLabelText('eg2Pro.school.fieldTeachers');
    expect(screen.getByTestId('school-quote-estimate')).toHaveTextContent('"teachers":5');
    expect(screen.getByTestId('school-quote-estimate')).toHaveTextContent('245');
    fireEvent.change(teachers, { target: { value: '12' } });
    expect(screen.getByTestId('school-quote-estimate')).toHaveTextContent('588');
    fireEvent.change(teachers, { target: { value: '3' } });
    expect(screen.queryByTestId('school-quote-estimate')).not.toBeInTheDocument();
    fireEvent.change(teachers, { target: { value: '' } });
    expect(screen.queryByTestId('school-quote-estimate')).not.toBeInTheDocument();
  });
});
