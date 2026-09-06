'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAssignments } from '@/hooks/useAssignments';
import type { TeacherAssignment, AssignmentStatus } from '@/lib/supabase/education/types';
import { cn } from '@/lib/utils';
import { Plus, BookOpen, Swords, ChevronDown, ChevronUp, Crosshair } from 'lucide-react';
import { readAssignmentFocus } from '@/lib/education/vocabFocus';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/Loader';
import CompletionTracker from './CompletionTracker';

interface AssignmentTrackingPanelProps {
  classroomId: string;
  onCreateAssignment?: () => void;
}

type FilterTab = 'all' | 'active' | 'overdue' | 'completed';

function AssignmentCard({
  assignment,
  status,
  onExpand,
  isExpanded,
}: {
  assignment: TeacherAssignment;
  status: AssignmentStatus;
  onExpand: () => void;
  isExpanded: boolean;
}) {
  const { t } = useLanguage();

  const completionPercentage =
    assignment.student_count && assignment.completion_count !== undefined
      ? Math.round((assignment.completion_count / assignment.student_count) * 100)
      : 0;

  const statusConfig = {
    active: { label: t('teacher.tracking.statusActive'), color: 'bg-green-500' },
    overdue: { label: t('teacher.tracking.statusOverdue'), color: 'bg-red-500 animate-pulse' },
    completed: { label: t('teacher.tracking.statusCompleted'), color: 'bg-neo-navy' },
  };

  const typeConfig: Record<string, { label: string; icon: typeof BookOpen; color: string }> = {
    practice: { label: t('teacher.tracking.practice'), icon: BookOpen, color: 'bg-neo-cyan' },
    duel: { label: t('teacher.tracking.duel'), icon: Swords, color: 'bg-neo-pink' },
  };

  const fallback = { label: assignment.assignment_type ?? '?', icon: BookOpen, color: 'bg-neo-navy' };
  const assignmentTypeConfig = typeConfig[assignment.assignment_type] ?? fallback;
  const TypeIcon = assignmentTypeConfig.icon;
  const practiceFocus = readAssignmentFocus(assignment);

  return (
    <div className="rounded-neo border-neo border-neo-black bg-neo-navy/50 overflow-hidden">
      <button
        onClick={onExpand}
        className="w-full p-4 hover:bg-neo-navy/80 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left: Lesson info */}
          <div className="flex-1 text-start">
            <div className="flex items-center gap-2 mb-2">
              <div
                className={cn(
                  'px-2 py-1 rounded text-xs font-bold border-neo flex items-center gap-1',
                  assignmentTypeConfig.color,
                  'text-neo-black'
                )}
              >
                <TypeIcon className="w-3 h-3" />
                {assignmentTypeConfig.label}
              </div>
              {practiceFocus && (
                <div
                  data-testid="assignment-focus-badge"
                  className="px-2 py-1 rounded text-xs font-bold border-neo bg-neo-yellow text-neo-black flex items-center gap-1"
                >
                  <Crosshair className="w-3 h-3" />
                  {t(`education.vocabFocus.focus.${practiceFocus}`)}
                </div>
              )}
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  statusConfig[status].color
                )}
                title={statusConfig[status].label}
              />
            </div>
            <h3 className="text-lg font-neo-display text-neo-white mb-1">
              {assignment.vocabulary_lessons?.name || t('teacher.tracking.untitledLesson')}
            </h3>
            {assignment.due_date && (
              <div className="text-sm text-neo-white">
                {t('teacher.tracking.dueDate')}: {new Date(assignment.due_date).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Right: Progress */}
          <div className="text-end shrink-0">
            <div className="text-sm font-neo-body text-neo-white mb-1">
              {assignment.completion_count}/{assignment.student_count} {t('teacher.tracking.studentsCompleted')}
            </div>
            <div className="w-24 h-2 bg-neo-black/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-neo-cyan transition-all"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <div className="text-xs text-neo-cyan mt-1">{completionPercentage}%</div>
          </div>

          {/* Expand icon */}
          <div className="shrink-0">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-neo-cyan" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neo-white" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded: Completion Tracker */}
      {isExpanded && (
        <div className="border-t border-neo-black/30 p-4 bg-neo-black/10">
          <CompletionTracker
            assignmentId={assignment.id}
            totalStudents={assignment.student_count || 0}
          />
        </div>
      )}
    </div>
  );
}

export default function AssignmentTrackingPanel({
  classroomId,
  onCreateAssignment,
}: AssignmentTrackingPanelProps) {
  const { t } = useLanguage();
  const { assignments, isLoading, error, getAssignmentStatus } = useAssignments(classroomId);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Calculate counts for each tab
  const counts = {
    all: assignments.length,
    active: assignments.filter(a => getAssignmentStatus(a) === 'active').length,
    overdue: assignments.filter(a => getAssignmentStatus(a) === 'overdue').length,
    completed: assignments.filter(a => getAssignmentStatus(a) === 'completed').length,
  };

  // Filter assignments based on active tab
  const filteredAssignments =
    activeTab === 'all'
      ? assignments
      : assignments.filter(a => getAssignmentStatus(a) === activeTab);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: t('teacher.tracking.all') },
    { key: 'active', label: t('teacher.tracking.active') },
    { key: 'overdue', label: t('teacher.tracking.overdue') },
    { key: 'completed', label: t('teacher.tracking.completed') },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={`tab-skeleton-${i}`}
              data-testid="skeleton"
              className="h-10 bg-neo-black/20 rounded-neo flex-1 animate-pulse"
            />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={`card-skeleton-${i}`}
              data-testid="skeleton"
              className="h-24 bg-neo-black/20 rounded-neo animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-neo">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with tabs and create button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2 flex-wrap flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-4 py-2 rounded-neo border-neo font-neo-body text-sm transition-all',
                activeTab === tab.key
                  ? 'bg-neo-cyan border-neo-cyan text-neo-black shadow-hard-sm font-bold'
                  : 'bg-neo-navy/50 border-neo-black text-neo-white hover:bg-neo-navy/80'
              )}
            >
              {tab.label} ({counts[tab.key]})
            </button>
          ))}
        </div>
        {onCreateAssignment && (
          <Button
            onClick={onCreateAssignment}
            className="bg-neo-cyan text-neo-black font-bold shadow-hard hover:shadow-hard-pressed flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('teacher.tracking.createAssignment')}
          </Button>
        )}
      </div>

      {/* Assignment List */}
      {filteredAssignments.length === 0 ? (
        <div className="p-12 text-center bg-neo-black/10 rounded-neo border-neo border-neo-black">
          <p className="text-neo-white font-neo-body mb-4">
            {activeTab === 'all'
              ? t('teacher.tracking.noAssignments')
              : t('teacher.tracking.noAssignmentsFilter')}
          </p>
          {activeTab === 'all' && onCreateAssignment && (
            <Button
              onClick={onCreateAssignment}
              className="bg-neo-cyan text-neo-black font-bold shadow-hard hover:shadow-hard-pressed"
            >
              {t('teacher.tracking.createFirst')}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              status={getAssignmentStatus(assignment)}
              onExpand={() => setExpandedId(expandedId === assignment.id ? null : assignment.id)}
              isExpanded={expandedId === assignment.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
