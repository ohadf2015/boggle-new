/**
 * ClassroomGameLobby QR Code Tests
 * Verifies QR code is rendered in Step 2 with the correct join URL.
 *
 * Note: The component has a known re-fetch loop (fetchTeacherData depends on
 * selectedClassroomId, which it sets during the fetch).  The tests use
 * findBy* queries so they retry across re-renders.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClassroomGameLobby } from '../ClassroomGameLobby';

// Mock qrcode.react — canvas doesn't work in jsdom
jest.mock('qrcode.react', () => ({
  QRCodeCanvas: ({ value }: { value: string }) => (
    <div data-testid="qr-code" data-value={value} />
  ),
}));

// ── contexts ──────────────────────────────────────────────────────────────────

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'teacher-1', email: 'teacher@test.com' },
    profile: { display_name: 'Test Teacher' },
    isLoading: false,
  }),
}));

// ── supabase data layer ────────────────────────────────────────────────────────

jest.mock('@/lib/supabase/education', () => ({
  getLessons: jest.fn().mockResolvedValue({
    data: [
      {
        id: 'lesson-1',
        name: 'Animals',
        words: [{ word: 'cat', canIntegrate: true }],
      },
    ],
  }),
  getClassrooms: jest.fn().mockResolvedValue({
    data: [{ id: 'classroom-1', name: 'Class A', member_count: 10 }],
  }),
}));

// ── utilities ─────────────────────────────────────────────────────────────────

jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('@/utils/SocketContext', () => ({
  getSocketURL: jest.fn(() => 'http://localhost:3000'),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
  toast: { success: jest.fn(), error: jest.fn() },
}));

// ── UI sub-components ─────────────────────────────────────────────────────────

jest.mock('@/components/ui/PageLoader', () => ({
  PageLoader: () => <div data-testid="page-loader" />,
}));

// WizardStep: always renders children + a Next button
jest.mock('@/components/ui/WizardStep', () => ({
  WizardStep: ({
    children,
    onNext,
    nextDisabled,
  }: {
    children: React.ReactNode;
    onNext?: () => void;
    nextDisabled?: boolean;
  }) => (
    <div data-testid="wizard-step">
      {children}
      <button data-testid="wizard-next" onClick={onNext} disabled={nextDisabled}>
        Next
      </button>
    </div>
  ),
}));

// MultiLessonSelector: one click selects all
jest.mock('../MultiLessonSelector', () => ({
  MultiLessonSelector: ({
    onSelectChange,
    lessons,
  }: {
    onSelectChange: (ids: string[]) => void;
    lessons: Array<{ id: string }>;
  }) => (
    <button
      data-testid="select-lessons"
      onClick={() => onSelectChange(lessons.map((l) => l.id))}
    >
      Select All
    </button>
  ),
}));

// ── helper: advance to Step 2 ─────────────────────────────────────────────────

/**
 * Waits for the lesson-selector to appear (data loaded), selects lessons,
 * then clicks Next to advance to Step 2.
 */
async function goToStep2() {
  // Step 1: wait for data load to expose the lesson selector
  const selectBtn = await screen.findByTestId('select-lessons', {}, { timeout: 8000 });
  fireEvent.click(selectBtn);

  // Wait for the Next button to become enabled, then click it
  await waitFor(
    () => {
      const btn = screen.getByTestId('wizard-next');
      expect(btn).not.toBeDisabled();
    },
    { timeout: 5000 }
  );
  fireEvent.click(screen.getByTestId('wizard-next'));
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('ClassroomGameLobby — QR code', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { origin: 'http://localhost' },
    });
  });

  it('renders the QR code element in step 2', async () => {
    render(<ClassroomGameLobby onBack={jest.fn()} />);
    await goToStep2();

    // QR appears after joinUrl effect fires (gameCode must be set first)
    await waitFor(
      () => expect(screen.getByTestId('qr-code')).toBeInTheDocument(),
      { timeout: 5000 }
    );
  }, 15000);

  it('encodes a join URL containing the game code', async () => {
    render(<ClassroomGameLobby onBack={jest.fn()} />);
    await goToStep2();

    let qrValue = '';
    await waitFor(
      () => {
        const qr = screen.getByTestId('qr-code');
        qrValue = qr.getAttribute('data-value') ?? '';
        expect(qrValue).toMatch(/^http:\/\/localhost\/join\?code=[A-Z0-9]{6}$/);
      },
      { timeout: 5000 }
    );

    const codeMatch = qrValue.match(/code=([A-Z0-9]+)$/);
    expect(codeMatch).not.toBeNull();
    expect(codeMatch![1]).toHaveLength(6);
  }, 15000);
});
