/**
 * ClassroomGameLobby loading state tests — RED phase
 * Asserts that PageLoader is used instead of bare spinner div
 */

import { render, screen } from '@testing-library/react';
import { ClassroomGameLobby } from '../ClassroomGameLobby';
import * as supabaseTeacher from '@/lib/supabase/education';
import { io } from 'socket.io-client';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'teacher-123', email: 'teacher@test.com' },
    profile: { display_name: 'Test Teacher' },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('socket.io-client');
vi.mock('@/lib/supabase/education');

const mockSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  disconnect: vi.fn(),
};
(io as jest.Mock).mockReturnValue(mockSocket);

// Mock PageLoader so we can detect it reliably
vi.mock('@/components/ui/PageLoader', () => ({
  PageLoader: ({ text }: { text?: string }) => (
    <div data-testid="page-loader">{text}</div>
  ),
}));

describe('ClassroomGameLobby — loading state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Make data fetching never resolve to keep component in loading state
    (supabaseTeacher.getLessons as jest.Mock).mockReturnValue(new Promise(() => {}));
    (supabaseTeacher.getClassrooms as jest.Mock).mockReturnValue(new Promise(() => {}));
  });

  it('renders PageLoader when fetching data', () => {
    render(<ClassroomGameLobby onBack={vi.fn()} />);

    expect(screen.getByTestId('page-loader')).toBeInTheDocument();
  });

  it('shows contextual loading text', () => {
    render(<ClassroomGameLobby onBack={vi.fn()} />);

    expect(screen.getByText('teacher.classroom.settingUp')).toBeInTheDocument();
  });

  it('does not render wizard content while loading', () => {
    render(<ClassroomGameLobby onBack={vi.fn()} />);

    // Step indicators only render after loading completes
    expect(screen.queryByText(/Step 1 of 2/i)).not.toBeInTheDocument();
  });
});
