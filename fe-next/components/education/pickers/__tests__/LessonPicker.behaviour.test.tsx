import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, a?: unknown, b?: Record<string, unknown>) => {
      const text = typeof a === 'string' ? a : k;
      const params = (typeof a === 'object' ? a : b) as Record<string, unknown> | undefined;
      return params ? text.replace(/\{(\w+)\}/g, (_, p) => String(params[p] ?? '')) : text;
    },
    language: 'en',
  }),
}));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => <a href={href} {...rest}>{children}</a>,
}));

import { LessonPicker } from '../LessonPicker';

const lesson = (id: string, language: string | undefined, words = ['cat', 'dog']) =>
  ({ id, name: `List ${id}`, language, description: null, words: words.map((word) => ({ word })) }) as never;

describe('LessonPicker', () => {
  it('Given mixed languages and a class language, Then class-language lists come first', () => {
    render(
      <LessonPicker mode="multi" lessons={[lesson('he1', 'he'), lesson('en1', 'en')]} selectedIds={[]} onChange={vi.fn()} classLanguage="en" />
    );
    expect(screen.getAllByRole('checkbox')[0]).toHaveAccessibleName(/List en1/);
  });

  it('badges every lesson with its language and shows the playable word count', () => {
    render(<LessonPicker mode="multi" lessons={[lesson('he1', 'he', ['שלום', 'שלום', 'בית']), lesson('en1', 'en')]} selectedIds={[]} onChange={vi.fn()} />);
    const card = screen.getByRole('checkbox', { name: /he1/ });
    expect(within(card).getByTestId('lesson-language-badge')).toHaveTextContent('עברית');
    expect(within(screen.getByRole('checkbox', { name: /en1/ })).getByTestId('lesson-language-badge')).toHaveTextContent('English');
    expect(card).toHaveTextContent('2');
  });

  it('Given lists in two languages, Then a chip row filters them: All, the class default, then the other languages present', () => {
    render(<LessonPicker mode="multi" lessons={[lesson('he1', 'he'), lesson('en1', 'en'), lesson('en2', 'en')]} selectedIds={[]} onChange={vi.fn()} classLanguage="en" />);
    const filter = screen.getByTestId('lesson-language-filter');
    expect(within(filter).getAllByRole('radio').map((r) => (r as HTMLInputElement).value)).toEqual(['all', 'en', 'he']);
    fireEvent.click(within(filter).getByRole('radio', { name: /עברית/ }));
    expect(screen.getAllByRole('checkbox').map((c) => c.textContent)).toEqual([expect.stringContaining('List he1')]);
  });

  it('Given lists in one language, Then there is no language filter', () => {
    render(<LessonPicker mode="multi" lessons={[lesson('en1', 'en'), lesson('en2', 'en')]} selectedIds={[]} onChange={vi.fn()} />);
    expect(screen.queryByTestId('lesson-language-filter')).toBeNull();
  });

  it('Given a Hebrew list in a class whose default is English, Then nothing warns: classes teach in many languages', () => {
    render(<LessonPicker mode="multi" lessons={[lesson('he1', 'he'), lesson('en1', 'en')]} selectedIds={['he1']} onChange={vi.fn()} classLanguage="en" />);
    expect(screen.queryByTestId('lesson-class-mismatch')).toBeNull();
  });

  it('When a list in another language is picked, Then the board switches to it and says so without calling it an error', () => {
    const onChange = vi.fn();
    render(
      <LessonPicker mode="multi" lessons={[lesson('en1', 'en'), lesson('en2', 'en'), lesson('he1', 'he')]} selectedIds={['en1', 'en2']} onChange={onChange} />
    );
    fireEvent.click(screen.getByRole('checkbox', { name: /List he1/ }));
    expect(onChange).toHaveBeenCalledWith(['he1']);
    expect(screen.getByRole('status')).toHaveTextContent(/Board switched to עברית/);
  });

  it('Select all only selects lists in the active language', () => {
    const onChange = vi.fn();
    render(
      <LessonPicker mode="multi" lessons={[lesson('en1', 'en'), lesson('he1', 'he'), lesson('en2', 'en')]} selectedIds={['en1']} onChange={onChange} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Select all English' }));
    expect(onChange).toHaveBeenCalledWith(['en1', 'en2']);
  });

  it('names the multi-select group by its heading', () => {
    render(<LessonPicker mode="multi" lessons={[lesson('a', 'en')]} selectedIds={[]} onChange={vi.fn()} />);
    expect(screen.getByRole('group', { name: 'education.classroomGame.selectLessons' })).toBeInTheDocument();
  });

  it('Given a selection that arrived mixed (repeat last setup), Then a warning names the language that wins', () => {
    render(
      <LessonPicker mode="multi" lessons={[lesson('he1', 'he'), lesson('en1', 'en')]} selectedIds={['he1', 'en1']} onChange={vi.fn()} />
    );
    expect(screen.getByTestId('lesson-mixed-warning')).toHaveTextContent(/עברית/);
  });

  it('Given more than six lists, Then a search box filters them by name', () => {
    const many = Array.from({ length: 7 }, (_, i) => lesson(`n${i}`, 'en'));
    render(<LessonPicker mode="multi" lessons={many} selectedIds={[]} onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'n3' } });
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });
    expect(screen.getByTestId('lesson-picker-no-match')).toBeInTheDocument();
  });

  it('Given six or fewer lists, Then there is no search box', () => {
    render(<LessonPicker mode="multi" lessons={[lesson('a', 'en')]} selectedIds={[]} onChange={vi.fn()} />);
    expect(screen.queryByRole('searchbox')).toBeNull();
  });

  it('Given no lists and a create link, Then the empty state offers "Create a word list"', () => {
    render(<LessonPicker mode="multi" lessons={[]} selectedIds={[]} onChange={vi.fn()} createHref="/en/teacher/curriculum" />);
    expect(screen.getByRole('link', { name: /create a word list/i })).toHaveAttribute('href', '/en/teacher/curriculum');
  });

  describe('single mode', () => {
    it('renders a radio group labelled by the caller and reports one id', () => {
      const onChange = vi.fn();
      render(
        <>
          <h3 id="step-1">Pick a list</h3>
          <LessonPicker mode="single" labelledBy="step-1" lessons={[lesson('a', 'en'), lesson('b', 'en')]} selectedIds={['a']} onChange={onChange} />
        </>
      );
      const group = screen.getByRole('radiogroup', { name: 'Pick a list' });
      expect(within(group).getByRole('radio', { name: /List a/ })).toBeChecked();
      fireEvent.click(within(group).getByRole('radio', { name: /List b/ }));
      expect(onChange).toHaveBeenCalledWith(['b']);
    });

    it('uses caller labels to tell same-named lists apart', () => {
      render(
        <LessonPicker mode="single" lessons={[lesson('a', 'en')]} selectedIds={[]} onChange={vi.fn()} labels={new Map([['a', 'List a (Period 2)']])} />
      );
      expect(screen.getByRole('radio', { name: /Period 2/ })).toBeInTheDocument();
    });

    it('tolerates lessons without a language', () => {
      render(<LessonPicker mode="single" lessons={[lesson('a', undefined)]} selectedIds={[]} onChange={vi.fn()} />);
      expect(screen.getByRole('radio', { name: /List a/ })).toBeInTheDocument();
      expect(screen.queryByTestId('lesson-language-badge')).toBeNull();
    });
  });
});
