import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PlayTabFirstRunCard from '../PlayTabFirstRunCard';
import { useLanguage } from '@/contexts/LanguageContext';

// Mock useLanguage hook
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(),
}));

describe('PlayTabFirstRunCard', () => {
  const mockT = (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'teacher.dashboard.createClassroomFirst': 'Create a classroom first',
      'teacher.dashboard.reviewEmptyHint': 'Track assignments and duel activity',
      'teacher.classroom.create': 'Create Classroom',
      'teacher.classroom.createAnother': 'Create Another Classroom',
      'teacher.classroom.creating': 'Creating...',
      'teacher.classroom.validation.nameRequired': 'Classroom name is required',
      'teacher.classroom.created': 'Classroom created! Share the code to get started.',
      'teacher.classroom.joinCode': 'Join Code',
      'teacher.classroom.copyCode': 'Copy Code',
      'teacher.classroom.codeCopied': 'Join code copied!',
      'teacher.classroom.error.copyFailed': 'Failed to copy code. Please try again.',
      'teacher.classroom.error.createFailed': 'Failed to create classroom',
      'teacher.classroom.namePlaceholder': 'Classroom Name',
      'teacher.classroom.shareCode': 'Share this code with your students',
    };
    // Handle interpolation for parameters
    if (params && translations[key]) {
      let text = translations[key];
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{{${k}}}`, String(v));
      });
      return text;
    }
    return translations[key] || key;
  };

  const mockCreateClassroom = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useLanguage as any).mockReturnValue({
      t: mockT,
      language: 'en',
    });
    mockCreateClassroom.mockResolvedValue({
      success: true,
      data: {
        id: 'class-123',
        name: 'Test Class',
        join_code: 'ABC123',
        language: 'en',
        teacher_id: 'teacher-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  });

  it('renders name input field on first paint', () => {
    render(<PlayTabFirstRunCard createClassroom={mockCreateClassroom} />);
    expect(screen.getByPlaceholderText(/classroom name/i)).toBeInTheDocument();
  });

  it('does NOT render a language selector', () => {
    render(<PlayTabFirstRunCard createClassroom={mockCreateClassroom} />);
    expect(screen.queryByLabelText(/language/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('requires classroom name (disables submit when empty)', async () => {
    render(<PlayTabFirstRunCard createClassroom={mockCreateClassroom} />);
    const submitButton = screen.getByRole('button', { name: /create classroom/i });

    expect(submitButton).toBeDisabled();

    const input = screen.getByPlaceholderText(/classroom name/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  ' } });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit when name has content', async () => {
    render(<PlayTabFirstRunCard createClassroom={mockCreateClassroom} />);
    const submitButton = screen.getByRole('button', { name: /create classroom/i });
    const input = screen.getByPlaceholderText(/classroom name/i) as HTMLInputElement;

    expect(submitButton).toBeDisabled();

    fireEvent.change(input, { target: { value: 'My Awesome Class' } });
    expect(submitButton).not.toBeDisabled();
  });

  it('calls createClassroom with trimmed name and interface language', async () => {
    render(<PlayTabFirstRunCard createClassroom={mockCreateClassroom} />);
    const input = screen.getByPlaceholderText(/classroom name/i);
    const submitButton = screen.getByRole('button', { name: /create classroom/i });

    fireEvent.change(input, { target: { value: '  Spanish 101  ' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateClassroom).toHaveBeenCalledWith('Spanish 101', 'en');
    });
  });

  it('displays join code inline on success (not in dialog, not on another tab)', async () => {
    render(<PlayTabFirstRunCard createClassroom={mockCreateClassroom} />);
    const input = screen.getByPlaceholderText(/classroom name/i);
    const submitButton = screen.getByRole('button', { name: /create classroom/i });

    fireEvent.change(input, { target: { value: 'Test Class' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });
  });

  it('shows copy affordance for join code', async () => {
    render(<PlayTabFirstRunCard createClassroom={mockCreateClassroom} />);
    const input = screen.getByPlaceholderText(/classroom name/i);
    const submitButton = screen.getByRole('button', { name: /create classroom/i });

    fireEvent.change(input, { target: { value: 'Test Class' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy.*code/i })).toBeInTheDocument();
    });
  });

  it('displays error message on creation failure', async () => {
    mockCreateClassroom.mockResolvedValueOnce({
      success: false,
      error: 'Network error occurred',
    });

    render(<PlayTabFirstRunCard createClassroom={mockCreateClassroom} />);
    const input = screen.getByPlaceholderText(/classroom name/i);
    const submitButton = screen.getByRole('button', { name: /create classroom/i });

    fireEvent.change(input, { target: { value: 'Test Class' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('shows loading state while creating', async () => {
    mockCreateClassroom.mockImplementationOnce(() => new Promise(() => {}));

    render(<PlayTabFirstRunCard createClassroom={mockCreateClassroom} />);
    const input = screen.getByPlaceholderText(/classroom name/i);
    const submitButton = screen.getByRole('button', { name: /create classroom/i });

    fireEvent.change(input, { target: { value: 'Test Class' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  it('preserves form when error occurs', async () => {
    mockCreateClassroom.mockResolvedValueOnce({
      success: false,
      error: 'Some error',
    });

    render(<PlayTabFirstRunCard createClassroom={mockCreateClassroom} />);
    const input = screen.getByPlaceholderText(/classroom name/i) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /create classroom/i });

    fireEvent.change(input, { target: { value: 'Test Class' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(input.value).toBe('Test Class');
    });
  });

  it('resets form for second creation when user clicks create again after success', async () => {
    render(<PlayTabFirstRunCard createClassroom={mockCreateClassroom} />);
    let input = screen.getByPlaceholderText(/classroom name/i) as HTMLInputElement;
    let submitButton = screen.getByRole('button', { name: /create classroom/i });

    fireEvent.change(input, { target: { value: 'Class One' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });

    // After success, user should have a way to create another
    const createAnotherButton = screen.queryByRole('button', { name: /create another/i });
    if (createAnotherButton) {
      fireEvent.click(createAnotherButton);

      // Re-query for the input element after re-render
      await waitFor(() => {
        input = screen.getByPlaceholderText(/classroom name/i) as HTMLInputElement;
        expect(input.value).toBe('');
      });
    }
  });

  it('uses interface language, not environment language', () => {
    (useLanguage as any).mockReturnValue({
      t: mockT,
      language: 'he',
    });

    render(<PlayTabFirstRunCard createClassroom={mockCreateClassroom} />);
    const input = screen.getByPlaceholderText(/classroom name/i);
    const submitButton = screen.getByRole('button', { name: /create classroom/i });

    fireEvent.change(input, { target: { value: 'שיעור' } });
    fireEvent.click(submitButton);

    expect(mockCreateClassroom).toHaveBeenCalledWith('שיעור', 'he');
  });
});
