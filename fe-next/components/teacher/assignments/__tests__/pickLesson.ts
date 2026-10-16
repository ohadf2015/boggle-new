import { fireEvent } from '@testing-library/react';

export function pickLesson(id: string) {
  const radio = document.querySelector<HTMLInputElement>(`[data-testid="assignment-lesson-picker"] input[type="radio"][value="${id}"]`);
  if (!radio) throw new Error(`no lesson radio for ${id}`);
  fireEvent.click(radio);
}
