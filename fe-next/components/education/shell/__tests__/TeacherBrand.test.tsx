import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/components/education/EduMascot', () => ({ EduMascot: () => null }));

import { TeacherBrand } from '../TeacherBrand';

describe('<TeacherBrand>', () => {
  it('reads the "for Teachers" subtitle as quiet cream, not a second lime accent', () => {
    render(<TeacherBrand href="/en/teacher" t={(k) => k} />);
    const tagline = screen.getByText('eduShell.brand.tagline');
    expect(tagline.className).toContain('text-neo-cream/70');
    expect(tagline.className).not.toContain('text-neo-lime');
  });
});
