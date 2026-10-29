import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'he' }) }));
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));
vi.mock('@/components/education/shell/EducationShell', () => ({ EducationShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/education/TeacherGate', () => ({ TeacherGate: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: ({ text }: { text: string }) => <p>{text}</p> }));

import ClassReadyPageClient from '../PageClient';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('class-ready (paid day 0)', () => {
  it('Given the paid class is provisioned, Then the teacher lands on the one shared class-ready screen', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { id: 'c1', name: 'A', join_code: 'ABCD', language: 'he' } }) }) as unknown as typeof fetch;
    render(<ClassReadyPageClient />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/he/teacher/classroom/new?classroomId=c1'));
    expect(global.fetch).toHaveBeenCalledWith('/api/education/classroom/paid-ready', expect.objectContaining({ method: 'POST' }));
  });

  it('Given provisioning fails, Then the error offers the way home and nothing redirects', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'not_paid_teacher' }) }) as unknown as typeof fetch;
    render(<ClassReadyPageClient />);
    expect(await screen.findByText('education.access.class_ready_error')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'education.access.class_ready_hq' })).toHaveAttribute('href', '/he/teacher');
    expect(replace).not.toHaveBeenCalled();
  });
});
