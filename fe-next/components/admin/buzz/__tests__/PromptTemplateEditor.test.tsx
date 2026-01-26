/**
 * Tests for PromptTemplateEditor component
 *
 * These tests verify:
 * 1. Template initialization with default prompt content
 * 2. Template saving functionality
 */

import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

// Mock dependencies before importing component
jest.mock('@/lib/supabase', () => ({
  getSession: jest.fn(),
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import PromptTemplateEditor from '../PromptTemplateEditor';
import { getSession } from '@/lib/supabase';

const mockSession = {
  data: {
    session: {
      access_token: 'test-token',
      user: { id: 'test-user-id' },
    },
  },
};

const mockTemplates = [
  {
    id: 1,
    template_type: 'riddle',
    language: null,
    name: 'Default Riddle Template',
    description: 'Test description',
    template_content: 'Existing template content',
    placeholders: [{ name: 'topic', description: 'Topic description' }],
    version: 1,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

const mockDefaultTemplateContent = `You are creating a riddle challenge for LexiClash.

**Riddle Philosophy**: The best riddles work on MULTIPLE LEVELS simultaneously.

**Input Variables**:
- Topic: {topic}
- Language: {language}
- Difficulty: {difficulty}
- Context: {context}

**Output**: Create a riddle that connects to the trending topic in an unexpected way.`;

/**
 * Helper to find the template content textarea
 * The textarea is identified by being the only textarea in the form
 */
function findTemplateTextarea(): HTMLTextAreaElement | undefined {
  const textareas = screen.getAllByRole('textbox');
  return textareas.find((el) => el.tagName.toLowerCase() === 'textarea') as
    | HTMLTextAreaElement
    | undefined;
}

describe('PromptTemplateEditor', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (getSession as jest.Mock).mockResolvedValue(mockSession);

    // Setup fetch mock
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  describe('Template Initialization', () => {
    it('should initialize new template with default prompt content from API', async () => {
      // Setup fetch responses
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockTemplates,
            count: mockTemplates.length,
          }),
        })
        // Response for default template fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              templateType: 'riddle',
              content: mockDefaultTemplateContent,
              fromDatabase: false,
              language: null,
            },
          }),
        });

      render(<PromptTemplateEditor />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Prompt Templates')).toBeInTheDocument();
      });

      // Click the "+" button for riddle templates to create a new one
      const addButton = screen.getAllByTitle('Create new template')[0];
      await act(async () => {
        fireEvent.click(addButton);
      });

      // Wait for the form to appear
      await waitFor(() => {
        expect(screen.getByText('Create New Template')).toBeInTheDocument();
      });

      // Find textarea by placeholder (more reliable than label association)
      // Wait for the default content to be loaded
      await waitFor(
        () => {
          // Use getAllByRole since there may be multiple textboxes
          const textareas = screen.getAllByRole('textbox');
          // The template content textarea is the largest one (h-64)
          const templateTextarea = textareas.find(
            (el) => el.tagName.toLowerCase() === 'textarea'
          ) as HTMLTextAreaElement;
          expect(templateTextarea).toBeDefined();
          expect(templateTextarea.value).toContain('Riddle Philosophy');
        },
        { timeout: 3000 }
      );
    });

    it('should show loading state while fetching default template', async () => {
      // Setup fetch responses with delay for default template
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockTemplates,
            count: mockTemplates.length,
          }),
        })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: async () => ({
                      success: true,
                      data: {
                        templateType: 'riddle',
                        content: mockDefaultTemplateContent,
                        fromDatabase: false,
                        language: null,
                      },
                    }),
                  }),
                100
              )
            )
        );

      render(<PromptTemplateEditor />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Prompt Templates')).toBeInTheDocument();
      });

      // Click create button
      const addButton = screen.getAllByTitle('Create new template')[0];
      fireEvent.click(addButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Loading default...')).toBeInTheDocument();
      });

      // Eventually should load the content
      await waitFor(
        () => {
          expect(screen.queryByText('Loading default...')).not.toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Template Saving', () => {
    it('should successfully save a new template', async () => {
      // Setup fetch responses
      fetchMock
        // Initial templates load
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [],
            count: 0,
          }),
        })
        // Default template content
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              templateType: 'riddle',
              content: mockDefaultTemplateContent,
              fromDatabase: false,
              language: null,
            },
          }),
        })
        // POST to create template
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            message: 'Template created successfully',
            data: { id: 2, ...mockTemplates[0] },
          }),
        })
        // Refresh templates after save
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [{ id: 2, ...mockTemplates[0] }],
            count: 1,
          }),
        });

      render(<PromptTemplateEditor />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Prompt Templates')).toBeInTheDocument();
      });

      // Click create button
      const addButton = screen.getAllByTitle('Create new template')[0];
      await act(async () => {
        fireEvent.click(addButton);
      });

      // Wait for form and default content
      await waitFor(() => {
        expect(screen.getByText('Create New Template')).toBeInTheDocument();
      });

      // Wait for content to load
      await waitFor(
        () => {
          const textarea = findTemplateTextarea();
          expect(textarea).toBeDefined();
          expect(textarea!.value.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );

      // Click save button
      const saveButton = screen.getByRole('button', { name: /create template/i });
      await act(async () => {
        fireEvent.click(saveButton);
      });

      // Should show success message and not be stuck on "Saving..."
      await waitFor(
        () => {
          expect(screen.getByText('Template created successfully')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Should NOT show saving state
      expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
    });

    it('should not get stuck on saving when network error occurs', async () => {
      // Setup fetch responses
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [],
            count: 0,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              templateType: 'riddle',
              content: mockDefaultTemplateContent,
              fromDatabase: false,
              language: null,
            },
          }),
        })
        // Network error on save
        .mockRejectedValueOnce(new Error('Network error'));

      render(<PromptTemplateEditor />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Prompt Templates')).toBeInTheDocument();
      });

      // Create new template
      const addButton = screen.getAllByTitle('Create new template')[0];
      await act(async () => {
        fireEvent.click(addButton);
      });

      // Wait for form
      await waitFor(() => {
        expect(screen.getByText('Create New Template')).toBeInTheDocument();
      });

      // Wait for content to load
      await waitFor(
        () => {
          const textarea = findTemplateTextarea();
          expect(textarea).toBeDefined();
          expect(textarea!.value.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );

      // Click save
      const saveButton = screen.getByRole('button', { name: /create template/i });
      await act(async () => {
        fireEvent.click(saveButton);
      });

      // Should show error and NOT be stuck on saving
      await waitFor(
        () => {
          // Should have an error message
          const errorElement = screen.queryByText(/error|failed/i);
          // The saving state should be cleared
          expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
          return errorElement !== null;
        },
        { timeout: 3000 }
      );
    });

    it('should handle API error response without getting stuck', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [],
            count: 0,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              templateType: 'riddle',
              content: mockDefaultTemplateContent,
              fromDatabase: false,
              language: null,
            },
          }),
        })
        // API error on save
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            error: 'Database connection failed',
          }),
        });

      render(<PromptTemplateEditor />);

      await waitFor(() => {
        expect(screen.getByText('Prompt Templates')).toBeInTheDocument();
      });

      const addButton = screen.getAllByTitle('Create new template')[0];
      await act(async () => {
        fireEvent.click(addButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Create New Template')).toBeInTheDocument();
      });

      await waitFor(
        () => {
          const textarea = findTemplateTextarea();
          expect(textarea).toBeDefined();
          expect(textarea!.value.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );

      const saveButton = screen.getByRole('button', { name: /create template/i });
      await act(async () => {
        fireEvent.click(saveButton);
      });

      // Should show error message
      await waitFor(
        () => {
          expect(screen.getByText('Database connection failed')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Should NOT be stuck on saving
      expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
    });
  });
});
