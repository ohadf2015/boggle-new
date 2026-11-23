import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClassReportHeader } from '../ClassReportHeader';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
    language: 'en',
    dir: 'ltr',
  }),
}));

const props = {
  eyebrow: 'Class report',
  name: '5B English',
  onBack: vi.fn(),
  link: { href: '/en/teacher/reports?classroomId=c1', label: 'All results', testId: 'header-link' },
};

describe('ClassReportHeader', () => {
  it('names the class as the page title under its eyebrow', () => {
    render(<ClassReportHeader {...props} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('5B English');
    expect(screen.getByText('Class report')).toBeInTheDocument();
  });

  it('goes back to the class page', () => {
    render(<ClassReportHeader {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'eduShell.home.classPage' }));
    expect(props.onBack).toHaveBeenCalledTimes(1);
  });

  it('offers one way across to the other half of the report', () => {
    render(<ClassReportHeader {...props} />);
    expect(screen.getByTestId('header-link')).toHaveAttribute('href', props.link.href);
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('Given no link, Then the header offers only the way back', () => {
    const { link: _link, ...rest } = props;
    render(<ClassReportHeader {...rest} />);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('states the class size as a plain fact when it is known', () => {
    const { rerender } = render(<ClassReportHeader {...props} memberCount={12} />);
    expect(screen.getByTestId('class-report-size')).toHaveTextContent('teacher.classroom.members_other:{"count":12}');
    rerender(<ClassReportHeader {...props} memberCount={1} />);
    expect(screen.getByTestId('class-report-size')).toHaveTextContent('teacher.classroom.members_one:{"count":1}');
    rerender(<ClassReportHeader {...props} />);
    expect(screen.queryByTestId('class-report-size')).toBeNull();
  });
});
