/**
 * Analytics Page - Teacher Classroom Analytics Dashboard
 *
 * Integrates all Phase 20 analytics components:
 * - AnalyticsDashboard (metrics overview)
 * - StudentProgressTable (detailed student data)
 * - LessonEffectivenessChart (lesson performance)
 * - VocabularyHeatmap (word mastery grid)
 * - LiveActivityIndicator (real-time updates)
 *
 * Features:
 * - Real-time progress updates via Supabase Realtime
 * - Tabbed interface for detailed views
 * - Neo-brutalist design with responsive layout
 * - RTL support for Hebrew
 */

import { Metadata } from 'next';
import { AnalyticsPageClient } from './PageClient';

// ============================================
// METADATA
// ============================================

export const metadata: Metadata = {
  title: 'Class Analytics | LexiClash',
  description: 'Track student progress, lesson effectiveness, and vocabulary mastery in real-time',
};

// ============================================
// PAGE PROPS
// ============================================

interface AnalyticsPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

// ============================================
// SERVER COMPONENT
// ============================================

/**
 * Analytics Page
 *
 * Server component that handles params and delegates to client component.
 * Auth check happens in PageClient via useAuth hook.
 */
export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { locale, id } = await params;

  return <AnalyticsPageClient classroomId={id} locale={locale} />;
}
