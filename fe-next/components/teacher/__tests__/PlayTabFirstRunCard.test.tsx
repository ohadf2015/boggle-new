import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlayTabFirstRunCard from '../PlayTabFirstRunCard';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import * as useClassroomHook from '@/hooks/useClassroom';

vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: vi.fn(),
}));

const mockTranslations = {
  en: {
    'teacher.classroom.defaultName': 'My Class',
    'teacher.classroom.create': 'Create Classroom',
    'teacher.classroom.language': 'Language',
    'languages.english': 'English',
    'teacher.classroom.joinCode': 'Join Code',
    'teacher.classroom.copyCode': 'Copy Code',
  },
};

function renderWithProviders(component: React.ReactElement) {
  return render(
    <AuthProvider>
      <LanguageProvider>
        {component}
      </LanguageProvider>
    </AuthProvider>
  );
}

describe('PlayTabFirstRunCard', () => {
  const mockCreateClassroom = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // The REAL shape `useClassrooms().createClassroom` resolves with on success
    // (hooks/useClassroom.ts). It never sets a top-level `code` on success — `code` is only
    // populated on the 403 failure branch, where it carries 'CLASS_LIMIT_REACHED'. This mock
    // used to invent `code: 'ABC123'`, which is why the card reading `result.code` looked
    // fine here and showed a first-time teacher NO join code in production.
    mockCreateClassroom.mockResolvedValue({
      success: true,
      data: { id: '123', name: 'My Class', join_code: 'ABC123' },
    });

    vi.mocked(useClassroomHook.useClassrooms).mockReturnValue({
      classrooms: [],
      isLoading: false,
      error: null,
      createClassroom: mockCreateClassroom,
      updateClassroom: vi.fn(),
      deleteClassroom: vi.fn(),
      refresh: vi.fn(),
    });
  });

  it('should render a name input field pre-filled with default classroom name', () => {
    renderWithProviders(
      <PlayTabFirstRunCard />
    );

    const nameInput = screen.getByDisplayValue('My Class') as HTMLInputElement;
    expect(nameInput).toBeInTheDocument();
    expect(nameInput.value).toBe('My Class');
  });

  it('should allow teacher to edit the default classroom name', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <PlayTabFirstRunCard />
    );

    const nameInput = screen.getByDisplayValue('My Class') as HTMLInputElement;

    // Clear and type new name
    await user.clear(nameInput);
    await user.type(nameInput, 'Period 1');

    expect(nameInput.value).toBe('Period 1');
  });

  it('should call createClassroom with the teacher\'s language when create button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <PlayTabFirstRunCard />
    );

    const createButton = screen.getByRole('button', { name: /create classroom/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(mockCreateClassroom).toHaveBeenCalledWith('My Class', 'en');
    });
  });

  it('should display join code after successful classroom creation', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <PlayTabFirstRunCard />
    );

    const createButton = screen.getByRole('button', { name: /create classroom/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });
  });

  it('should show copy button for join code', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <PlayTabFirstRunCard />
    );

    const createButton = screen.getByRole('button', { name: /create classroom/i });
    await user.click(createButton);

    await waitFor(() => {
      const copyButton = screen.getByRole('button', { name: /copy code/i });
      expect(copyButton).toBeInTheDocument();
    });
  });

  it('should disable create button until classroom is created or during loading', async () => {
    const user = userEvent.setup();
    mockCreateClassroom.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    );

    renderWithProviders(
      <PlayTabFirstRunCard />
    );

    const createButton = screen.getByRole('button', { name: /create classroom/i }) as HTMLButtonElement;
    expect(createButton.disabled).toBe(false);

    await user.click(createButton);
    expect(createButton.disabled).toBe(true);
  });

  it('should have exactly ONE required input field for maximum simplicity', () => {
    renderWithProviders(
      <PlayTabFirstRunCard />
    );

    // Check for textbox inputs (should only be the name field)
    const textboxes = screen.getAllByRole('textbox');
    expect(textboxes.length).toBe(1); // Only name field
    expect((textboxes[0] as HTMLInputElement).required).toBe(true); // Name is required

    // Verify there is NO language select dropdown
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('should reach join code display within 2 clicks: 1 to clear name, 1 to create', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <PlayTabFirstRunCard />
    );

    const nameInput = screen.getByDisplayValue('My Class') as HTMLInputElement;
    const createButton = screen.getByRole('button', { name: /create classroom/i });

    // Click 1: clear and type (single user interaction)
    await user.clear(nameInput);
    await user.type(nameInput, 'Period 1');

    // Click 2: submit
    await user.click(createButton);

    // After 2 interactions, the join code should be visible
    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });
  });
});
