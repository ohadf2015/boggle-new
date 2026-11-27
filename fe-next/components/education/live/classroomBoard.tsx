'use client';

import { createContext, useContext } from 'react';

/**
 * True inside a classroom round. The shared board pieces read it to swap their navy
 * chrome for the sky skin; without a provider (every arcade room) nothing changes.
 */
const ClassroomBoardContext = createContext(false);

export const ClassroomBoardProvider = ClassroomBoardContext.Provider;

export function useClassroomBoard(): boolean {
  return useContext(ClassroomBoardContext);
}

/** The board frame's navy fill (a custom utility with a gradient) needs the shorthand to turn cream. */
export const CLASSROOM_BOARD_FRAME = '![background:var(--edu-surface)]';
