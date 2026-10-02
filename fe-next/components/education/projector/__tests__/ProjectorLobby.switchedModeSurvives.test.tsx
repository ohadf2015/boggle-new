import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProjectorLobby } from '../ProjectorLobby';

const t = (key: string) => key;

function renderLobby() {
  return render(
    <AuthProvider>
      <LanguageProvider>
        <ProjectorLobby
          gameCode="NVDULQ"
          language="en"
          baseUrl="http://localhost:3000"
          students={[{ username: 'Ada' }]}
          readyUsernames={[]}
          t={t}
          onStartGame={vi.fn()}
          startLabelKey="hostView.startClassGame"
          classroomGameMode="classic"
        />
      </LanguageProvider>
    </AuthProvider>
  );
}

describe('ProjectorLobby — a mode switched in place survives the round', () => {
  beforeEach(() => sessionStorage.clear());

  it('Given the teacher switched Classic to Wordcraft and a round ran, Then the remounted lobby still names Wordcraft', () => {
    sessionStorage.setItem('lessonGameData', JSON.stringify({ gameMode: 'wordcraft', lessonName: 'Common English' }));
    renderLobby();
    expect(screen.getByTestId('lobby-change-mode')).toHaveTextContent('teacher.classroom.gameModes.wordcraft');
  });

  it('Given no switch was made, Then the launch mode is what the lobby names', () => {
    sessionStorage.setItem('lessonGameData', JSON.stringify({ gameMode: 'classic' }));
    renderLobby();
    expect(screen.getByTestId('lobby-change-mode')).toHaveTextContent('teacher.classroom.gameModes.classic');
  });
});
