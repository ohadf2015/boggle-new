import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EduRoomFullNotice } from '@/components/education/live/EduRoomFullNotice';

const t = (key: string, params?: Record<string, string | number>) => `${key}${params ? JSON.stringify(params) : ''}`;

const room = [
  { username: 'Teacher', isHost: true },
  { username: 'Robo', isBot: true },
  ...Array.from({ length: 49 }, (_, i) => ({ username: `kid${i}` })),
];

describe('EduRoomFullNotice', () => {
  it('given students watching because the room is full, then the teacher sees seated students out of the 50-seat cap', () => {
    render(<EduRoomFullNotice players={room} watching={3} t={t} />);
    const note = screen.getByTestId('edu-room-full-notice');
    expect(note).toHaveAttribute('role', 'status');
    expect(note).toHaveTextContent('eduLiveRoom.lobby.roomFull{"seated":49,"max":50}');
    expect(note).toHaveTextContent('eduLiveRoom.lobby.roomFullWatching{"count":3}');
  });

  it('given nobody is watching, then nothing is shown', () => {
    const { container } = render(<EduRoomFullNotice players={room} watching={0} t={t} />);
    expect(container).toBeEmptyDOMElement();
  });
});
