import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassroomWaitingRoom } from '../ClassroomWaitingRoom';

const mockT = (key: string, params?: Record<string, string | number>) => {
  const translations: Record<string, string> = {
    'education.classroomGame.classCode': 'Game Code',
    'education.classroomGame.waitingForStudents': 'Waiting for Students',
    'education.classroomGame.studentCount': `Students Joined: ${params?.count || 0}`,
    'education.classroomGame.joinedStudents': 'Students in Room',
    'education.classroomGame.more': 'more',
    'education.classroomGame.noStudentsYet': 'No students have joined yet',
    'education.classroomGame.studentsCanScan': 'Students can scan the QR code to join',
  };
  return translations[key] || key;
};

describe('ClassroomWaitingRoom', () => {
  it('should render with game code displayed', () => {
    render(
      <ClassroomWaitingRoom
        gameCode="ABC123"
        students={[]}
        t={mockT}
      />
    );

    expect(screen.getByText('ABC123')).toBeInTheDocument();
  });

  it('should display student count when students have joined', () => {
    const students = [
      { username: 'Alice', joinedAt: Date.now() },
      { username: 'Bob', joinedAt: Date.now() - 1000 },
    ];

    render(
      <ClassroomWaitingRoom
        gameCode="ABC123"
        students={students}
        t={mockT}
      />
    );

    expect(screen.getByText(/Students Joined: 2/)).toBeInTheDocument();
  });

  it('should display student names when students have joined', () => {
    const students = [
      { username: 'Alice', joinedAt: Date.now() },
      { username: 'Bob', joinedAt: Date.now() - 1000 },
    ];

    render(
      <ClassroomWaitingRoom
        gameCode="ABC123"
        students={students}
        t={mockT}
      />
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should show waiting spinner when no students have joined', () => {
    render(
      <ClassroomWaitingRoom
        gameCode="ABC123"
        students={[]}
        t={mockT}
      />
    );

    expect(screen.getByText('No students have joined yet')).toBeInTheDocument();
  });

  it('should render dark background for projector visibility', () => {
    const { container } = render(
      <ClassroomWaitingRoom
        gameCode="ABC123"
        students={[]}
        t={mockT}
      />
    );

    const mainDiv = container.firstChild;
    expect(mainDiv).toHaveClass('bg-neo-navy');
  });

  it('should limit student display to 10 when more have joined', () => {
    const students = Array.from({ length: 15 }, (_, i) => ({
      username: `Student${i + 1}`,
      joinedAt: Date.now() - i * 1000,
    }));

    render(
      <ClassroomWaitingRoom
        gameCode="ABC123"
        students={students}
        t={mockT}
      />
    );

    // Should show first 10 students
    expect(screen.getByText('Student1')).toBeInTheDocument();
    expect(screen.getByText('Student10')).toBeInTheDocument();
    // Should show +5 more indicator
    expect(screen.getByText(/\+5/)).toBeInTheDocument();
  });
});
