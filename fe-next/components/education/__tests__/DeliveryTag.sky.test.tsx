import { describe, expect, it } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DeliveryTag } from '../DeliveryTag';

describe('<DeliveryTag> on the sky landing', () => {
  it('Given a mode card, Then the tag ink and fill come from the same theme, never ink-coloured text on a black pill', () => {
    render(<DeliveryTag delivery="phones" t={(k) => k} />);
    const tag = screen.getByTestId('delivery-tag-phones').className;
    expect(tag).not.toMatch(/(^|\s)bg-neo-black/);
    expect(tag).toMatch(/(^|\s)bg-edu-ink\/\d+/);
    expect(tag).toContain('text-edu-ink');
  });
});
