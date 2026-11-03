import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { knobs, resetKnobs, asStudent } from './academyTestMocks';
import StudentPageClient from '../PageClient';

beforeEach(() => resetKnobs());

describe('guest "Not you?" on the student hub', () => {
  it('Given a guest on a shared device, When they tap Not you?, Then the next student lands on the join screen, never the game home', async () => {
    asStudent({ is_anonymous: true });
    render(<StudentPageClient />);
    const button = await screen.findByText('student.notYou');
    fireEvent.click(button.closest('button')!);
    await waitFor(() => expect(knobs.push).toHaveBeenCalledWith('/en/student/join'));
    for (const [target] of knobs.push.mock.calls) expect(target).toMatch(/^\/en\/(student|join)(\/|$)/);
  });
});
