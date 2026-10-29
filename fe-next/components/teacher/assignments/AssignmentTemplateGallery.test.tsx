import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AssignmentTemplateGallery } from './AssignmentTemplateGallery';
import { assignmentTemplatesFor } from '@/lib/education/assignmentTemplates';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

describe('AssignmentTemplateGallery', () => {
  const templates = assignmentTemplatesFor('en');
  const onAssign = vi.fn();
  const onClose = vi.fn();
  const onCreateOwn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lets a teacher browse templates by grade band and subject', () => {
    render(
      <AssignmentTemplateGallery
        templates={templates}
        isSubmitting={false}
        onAssign={onAssign}
        onClose={onClose}
        onCreateOwn={onCreateOwn}
      />,
    );

    expect(screen.getByTestId('assignment-template-gallery')).toBeInTheDocument();
    expect(screen.getByTestId('template-filter-grade-3-5')).toBeInTheDocument();
    expect(screen.getByTestId('template-filter-subject-geography')).toBeInTheDocument();
    expect(screen.getByTestId(`assignment-template-${templates[0].id}`)).toBeInTheDocument();
  });

  it('previews the word list then one-click assigns', () => {
    render(
      <AssignmentTemplateGallery
        templates={templates}
        isSubmitting={false}
        onAssign={onAssign}
        onClose={onClose}
        onCreateOwn={onCreateOwn}
      />,
    );

    const first = templates[0];
    fireEvent.click(screen.getByTestId(`assignment-template-preview-${first.id}`));
    expect(screen.getByTestId(`assignment-template-words-${first.id}`)).toBeInTheDocument();
    expect(screen.getByText(first.words[0].word)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(`assignment-template-assign-${first.id}`));
    expect(onAssign).toHaveBeenCalledWith(first);
  });

  it('narrows the grid when a subject chip is selected', () => {
    render(
      <AssignmentTemplateGallery
        templates={templates}
        isSubmitting={false}
        onAssign={onAssign}
        onClose={onClose}
        onCreateOwn={onCreateOwn}
      />,
    );

    fireEvent.click(screen.getByTestId('template-filter-subject-science'));
    const science = templates.filter((t) => t.subject === 'science');
    const other = templates.filter((t) => t.subject !== 'science');
    expect(screen.getByTestId(`assignment-template-${science[0].id}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`assignment-template-${other[0].id}`)).toBeNull();
  });

  it('hides a subject chip that has no templates in this language', () => {
    render(<AssignmentTemplateGallery templates={templates} isSubmitting={false} onAssign={onAssign} onClose={onClose} />);
    expect(screen.queryByTestId('template-filter-subject-language')).toBeNull();
  });

  it('Given class languages, Then a language chip row picks which templates show', () => {
    const onLanguageChange = vi.fn();
    render(
      <AssignmentTemplateGallery
        templates={templates}
        isSubmitting={false}
        onAssign={onAssign}
        onClose={onClose}
        language="en"
        languages={['en', 'he']}
        onLanguageChange={onLanguageChange}
      />,
    );
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radios.map((r) => r.value)).toEqual(['en', 'he']);
    fireEvent.click(radios[1]);
    expect(onLanguageChange).toHaveBeenCalledWith('he');
  });
});
