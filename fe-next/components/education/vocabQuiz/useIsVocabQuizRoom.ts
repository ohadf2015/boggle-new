/**
 * Live Vocab Quiz — "is this room running a quiz?"
 *
 * A deliberately tiny detector for the multiplayer shell, which needs to swap
 * in the quiz surface but should not carry the full quiz state. It cannot ask
 * `game.gameMode`: the quiz is not a `GameMode` (see shared/types/vocabQuiz),
 * so the room's mode is whatever board mode the lobby last held. The server's
 * own quiz traffic is the signal instead.
 *
 * `VocabQuizView` mounts after this flips and asks for its own snapshot, so a
 * student who joins or refreshes mid-round still lands on the live question.
 */

'use client';

import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';

export function useIsVocabQuizRoom(socket: Socket | null): boolean {
  const [isQuizRoom, setIsQuizRoom] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const claim = () => setIsQuizRoom(true);
    // `state` is the reconnect answer and may say the quiz is already over —
    // still a quiz room, because the student must see final standings rather
    // than a letter grid that was never generated.
    socket.on(VOCAB_QUIZ_EVENTS.question, claim);
    socket.on(VOCAB_QUIZ_EVENTS.state, claim);
    socket.on(VOCAB_QUIZ_EVENTS.ended, claim);

    const ask = () => socket.emit(VOCAB_QUIZ_EVENTS.requestState);
    socket.on('connect', ask);
    ask();

    return () => {
      socket.off(VOCAB_QUIZ_EVENTS.question, claim);
      socket.off(VOCAB_QUIZ_EVENTS.state, claim);
      socket.off(VOCAB_QUIZ_EVENTS.ended, claim);
      socket.off('connect', ask);
    };
  }, [socket]);

  return isQuizRoom;
}

export default useIsVocabQuizRoom;
