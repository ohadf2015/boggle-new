/**
 * useRealtimeClassroomProgress Hook
 *
 * Manages real-time classroom progress subscriptions and tracks active students.
 * Provides connection status, recent activity feed, and active student count.
 *
 * @example
 * const { isConnected, activeStudentsCount, recentActivity } = useRealtimeClassroomProgress({
 *   classroomId: 'classroom-123',
 *   enabled: true,
 *   onStudentActivity: (studentId, activity) => console.log(studentId, activity),
 * });
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { subscribeToClassroomProgress, type ClassroomProgressUpdate } from '@/lib/supabaseRealtime';
import { getClassroomStudents } from '@/lib/supabase/education';
import { resolveDisplayName } from '@/lib/displayName';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface UseRealtimeClassroomProgressOptions {
  /** Classroom ID to watch */
  classroomId: string;
  /** Whether to enable the subscription (default: true) */
  enabled?: boolean;
  /** Callback when student activity occurs */
  onStudentActivity?: (studentId: string, activity: string) => void;
}

export interface RecentActivityItem {
  studentId: string;
  studentName: string;
  activity: 'word_attempted' | 'lesson_completed' | 'xp_gained';
  timestamp: Date;
}

export interface UseRealtimeClassroomProgressReturn {
  /** Whether currently connected to realtime */
  isConnected: boolean;
  /** Last update timestamp */
  lastUpdate: Date | null;
  /** Count of students active in last 5 minutes */
  activeStudentsCount: number;
  /** Recent activity feed (last 10 events) */
  recentActivity: RecentActivityItem[];
  /** Connection status */
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

// ============================================
// CONSTANTS
// ============================================

const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RECENT_ACTIVITY = 10;

// ============================================
// HOOK
// ============================================

export function useRealtimeClassroomProgress({
  classroomId,
  enabled = true,
  onStudentActivity,
}: UseRealtimeClassroomProgressOptions): UseRealtimeClassroomProgressReturn {
  // ==================== STATE ====================

  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeStudents, setActiveStudents] = useState<Map<string, Date>>(new Map());
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);

  // Realtime payloads carry only `student_id`. The feed used to read `data.student_name`, a
  // column `student_lesson_progress` does not have anywhere in this codebase — so the
  // fallback fired every time and the teacher's Live Activity listed raw UUIDs. Names come
  // from the roster instead, resolved once per classroom.
  const namesRef = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    if (!enabled || !classroomId) return;
    let cancelled = false;
    getClassroomStudents(classroomId).then(({ data }) => {
      if (cancelled || !data) return;
      const next = new Map<string, string>();
      for (const row of data) {
        const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        const id = row.student_id;
        if (!id) continue;
        next.set(id, resolveDisplayName([p?.display_name, p?.username], ''));
      }
      namesRef.current = next;
    }).catch(() => { /* roster unavailable — fall back to the short id below */ });
    return () => { cancelled = true; };
  }, [classroomId, enabled]);

  // Use ref for callback to avoid re-subscription
  const onStudentActivityRef = useRef(onStudentActivity);
  useEffect(() => {
    onStudentActivityRef.current = onStudentActivity;
  }, [onStudentActivity]);

  // ==================== ACTIVITY HANDLER ====================

  const handleUpdate = useCallback((payload: ClassroomProgressUpdate) => {
    if (!payload.studentId) return;
    const studentId = payload.studentId;
    const data = payload.data as { xp_gained?: unknown; student_name?: string };
    const now = new Date();
    setLastUpdate(now);

    // Update active students map
    setActiveStudents(prev => {
      const next = new Map(prev);
      next.set(studentId, now);
      return next;
    });

    // Determine activity type from event
    let activity: 'word_attempted' | 'lesson_completed' | 'xp_gained';
    if (payload.eventType === 'INSERT') {
      activity = 'lesson_completed';
    } else if (data?.xp_gained) {
      activity = 'xp_gained';
    } else {
      activity = 'word_attempted';
    }

    // Add to recent activity
    setRecentActivity(prev => {
      const newActivity: RecentActivityItem = {
        studentId,
        // Never the bare UUID: it tells a teacher nothing and leaks an internal id. A short
        // prefix at least distinguishes two unnamed students from each other.
        studentName: namesRef.current.get(studentId) || `#${studentId.slice(0, 4)}`,
        activity,
        timestamp: now,
      };

      // Keep only last MAX_RECENT_ACTIVITY items
      const next = [newActivity, ...prev];
      return next.slice(0, MAX_RECENT_ACTIVITY);
    });

    // Call external callback
    if (onStudentActivityRef.current) {
      onStudentActivityRef.current(studentId, activity);
    }
  }, []);

  // ==================== STATUS HANDLER ====================

  const handleStatusChange = useCallback((status: string) => {
    if (status === 'SUBSCRIBED') {
      setConnectionStatus('connected');
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      setConnectionStatus('error');
    } else if (status === 'CLOSED') {
      setConnectionStatus('disconnected');
    }
  }, []);

  // ==================== CLEANUP INACTIVE STUDENTS ====================

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setActiveStudents(prev => {
        const next = new Map(prev);
        let changed = false;

        // Remove students inactive for more than ACTIVE_THRESHOLD_MS
        for (const [studentId, lastActivity] of next.entries()) {
          if (now - lastActivity.getTime() > ACTIVE_THRESHOLD_MS) {
            next.delete(studentId);
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [enabled]);

  // ==================== SUBSCRIPTION ====================

  useEffect(() => {
    if (!enabled) {
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus('connecting');

    const unsubscribe = subscribeToClassroomProgress(
      classroomId,
      handleUpdate,
      {
        onStatusChange: handleStatusChange,
      }
    );

    return () => {
      unsubscribe();
      setConnectionStatus('disconnected');
    };
  }, [classroomId, enabled, handleUpdate, handleStatusChange]);

  // ==================== RETURN ====================

  return {
    isConnected: connectionStatus === 'connected',
    lastUpdate,
    activeStudentsCount: activeStudents.size,
    recentActivity,
    connectionStatus,
  };
}
