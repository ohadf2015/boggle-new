/**
 * ClassroomGameLobby loading state tests — RED phase
 * Asserts that PageLoader is used instead of bare spinner div
 */

import { render, screen } from '@testing-library/react';
import { ClassroomGameLobby } from '../ClassroomGameLobby';
import * as supabaseTeacher from '@/lib/supabase/education';
import { io } from 'socket.io-client';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'teacher-123', email: 'teacher@test.com' },
    profile: { display_name: 'Test Teacher' },
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('socket.io-client');
jest.mock('@/lib/supabase/education');

const mockSocket = {
  emit: jest.fn(),
  on: jest.fn(),
  disconnect: jest.fn(),
};
(io as jest.Mock).mockReturnValue(mockSocket);

// Mock PageLoader so we can detect it reliably
jest.mock('@/components/ui/PageLoader', () => ({
  PageLoader: ({ text }: { text?: string }) => (
    <div data-testid="page-loader">{text}</div>
  ),
}));

describe('ClassroomGameLobby — loading state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Make data fetching never resolve to keep component in loading state
    (supabaseTeacher.getLessons as jest.Mock).mockReturnValue(new Promise(() => {}));
    (supabaseTeacher.getClassrooms as jest.Mock).mockReturnValue(new Promise(() => {}));
  });

  it('renders PageLoader when fetching data', () => {
    render(<ClassroomGameLobby onBack={jest.fn()} />);

    expect(screen.getByTestId('page-loader')).toBeInTheDocument();
  });

  it('shows contextual loading text', () => {
    render(<ClassroomGameLobby onBack={jest.fn()} />);

    expect(screen.getByText('teacher.classroom.settingUp')).toBeInTheDocument();
  });

  it('does not render wizard content while loading', () => {
    render(<ClassroomGameLobby onBack={jest.fn()} />);

    // Step indicators only render after loading completes
    expect(screen.queryByText(/Step 1 of 2/i)).not.toBeInTheDocument();
  });
});
