import { act, fireEvent, screen } from '@testing-library/react';

export function openMore(): void {
  const more = screen.getByTestId('edu-student-more') as HTMLDetailsElement;
  act(() => {
    more.open = true;
    fireEvent(more, new Event('toggle'));
  });
}
