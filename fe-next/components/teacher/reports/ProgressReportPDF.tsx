/**
 * ProgressReportPDF - PDF Document Component for Progress Reports
 *
 * Generates PDF documents for student and class progress reports
 * using @react-pdf/renderer. Supports Hebrew RTL and English LTR.
 *
 * @example
 * ```tsx
 * import { pdf } from '@react-pdf/renderer';
 * import { ProgressReportPDF } from './ProgressReportPDF';
 *
 * const blob = await pdf(<ProgressReportPDF data={studentData} />).toBlob();
 * ```
 */

'use client';

import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer';
import { useLanguage } from '@/contexts/LanguageContext';

// =============================================
// TYPE DEFINITIONS
// =============================================

export interface StudentReportPDFData {
  type: 'student';
  studentName: string;
  classroomName: string;
  generatedAt: Date;
  metrics: {
    wordsLearned: number;
    totalWords: number;
    accuracy: number;
    practiceTimeMinutes: number;
    currentStreak: number;
    longestStreak: number;
    sessionsCompleted: number;
    averageScore: number;
    masteryLevel: string;
  };
  wordMastery: Array<{
    word: string;
    mastered: boolean;
    accuracy: number;
    attempts: number;
  }>;
}

export interface ClassReportPDFData {
  type: 'class';
  classroomName: string;
  teacherName: string;
  generatedAt: Date;
  metrics: {
    totalStudents: number;
    activeStudents: number;
    classAverageAccuracy: number;
    classAverageWordsLearned: number;
    completionRate: number;
    participationRate: number;
  };
  topPerformers: Array<{
    studentName: string;
    accuracy: number;
    wordsLearned: number;
  }>;
  studentRankings: Array<{
    rank: number;
    studentName: string;
    score: number;
    accuracy: number;
    wordsLearned: number;
  }>;
}

export type ReportPDFData = StudentReportPDFData | ClassReportPDFData;

interface ProgressReportPDFProps {
  data: ReportPDFData;
}

// =============================================
// STYLES
// =============================================

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  pageRTL: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    direction: 'rtl',
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#1a1a2e',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
  },
  date: {
    fontSize: 10,
    color: '#999999',
    marginTop: 5,
  },
  section: {
    marginTop: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48%',
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    padding: 8,
    borderRadius: 4,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 10,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fafafa',
  },
  tableCell: {
    fontSize: 10,
    color: '#333333',
  },
  col1: { width: '10%' },
  col2: { width: '30%' },
  col3: { width: '20%' },
  col4: { width: '20%' },
  col5: { width: '20%' },
  wordCol1: { width: '40%' },
  wordCol2: { width: '20%' },
  wordCol3: { width: '20%' },
  wordCol4: { width: '20%' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#999999',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 10,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
    fontSize: 9,
  },
  badgeMastered: {
    backgroundColor: '#22c55e',
    color: '#ffffff',
  },
  badgePracticing: {
    backgroundColor: '#f59e0b',
    color: '#ffffff',
  },
  topPerformerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    marginBottom: 8,
  },
  topPerformerRank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d97706',
    marginRight: 10,
  },
  topPerformerName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a2e',
    flex: 1,
  },
  topPerformerStats: {
    fontSize: 10,
    color: '#666666',
  },
});

// =============================================
// HELPER FUNCTIONS
// =============================================

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

// =============================================
// STUDENT REPORT COMPONENT
// =============================================

function StudentReport({ data, t, isRTL }: {
  data: StudentReportPDFData;
  t: (key: string) => string;
  isRTL: boolean;
}) {
  return (
    <Page size="A4" style={isRTL ? styles.pageRTL : styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('teacher.reports.studentReport')}</Text>
        <Text style={styles.subtitle}>{data.studentName}</Text>
        <Text style={styles.subtitle}>{data.classroomName}</Text>
        <Text style={styles.date}>{formatDate(data.generatedAt)}</Text>
      </View>

      {/* Metrics Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('teacher.reports.sections.summary')}</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{t('teacher.reports.metrics.wordsLearned')}</Text>
            <Text style={styles.metricValue}>
              {data.metrics.wordsLearned} / {data.metrics.totalWords}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{t('teacher.reports.metrics.accuracy')}</Text>
            <Text style={styles.metricValue}>{data.metrics.accuracy}%</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{t('teacher.reports.metrics.practiceTime')}</Text>
            <Text style={styles.metricValue}>
              {formatMinutes(data.metrics.practiceTimeMinutes)}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{t('teacher.reports.metrics.currentStreak')}</Text>
            <Text style={styles.metricValue}>{data.metrics.currentStreak} days</Text>
          </View>
        </View>
      </View>

      {/* Word Mastery Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('teacher.reports.sections.wordMastery')}</Text>
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.wordCol1]}>Word</Text>
            <Text style={[styles.tableHeaderCell, styles.wordCol2]}>Status</Text>
            <Text style={[styles.tableHeaderCell, styles.wordCol3]}>Accuracy</Text>
            <Text style={[styles.tableHeaderCell, styles.wordCol4]}>Attempts</Text>
          </View>

          {/* Table Rows */}
          {data.wordMastery.slice(0, 15).map((word, index) => (
            <View
              key={word.word}
              style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
            >
              <Text style={[styles.tableCell, styles.wordCol1]}>{word.word}</Text>
              <Text style={[styles.tableCell, styles.wordCol2]}>
                {word.mastered ? 'Mastered' : 'Practicing'}
              </Text>
              <Text style={[styles.tableCell, styles.wordCol3]}>{word.accuracy}%</Text>
              <Text style={[styles.tableCell, styles.wordCol4]}>{word.attempts}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer} fixed>
        <Text>Generated by LexiClash - {formatDate(data.generatedAt)}</Text>
      </View>
    </Page>
  );
}

// =============================================
// CLASS REPORT COMPONENT
// =============================================

function ClassReport({ data, t, isRTL }: {
  data: ClassReportPDFData;
  t: (key: string) => string;
  isRTL: boolean;
}) {
  return (
    <Page size="A4" style={isRTL ? styles.pageRTL : styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('teacher.reports.classReport')}</Text>
        <Text style={styles.subtitle}>{data.classroomName}</Text>
        <Text style={styles.subtitle}>Teacher: {data.teacherName}</Text>
        <Text style={styles.date}>{formatDate(data.generatedAt)}</Text>
      </View>

      {/* Class Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('teacher.reports.sections.summary')}</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Students</Text>
            <Text style={styles.metricValue}>{data.metrics.totalStudents}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Active Students</Text>
            <Text style={styles.metricValue}>{data.metrics.activeStudents}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Class Average Accuracy</Text>
            <Text style={styles.metricValue}>{data.metrics.classAverageAccuracy}%</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Completion Rate</Text>
            <Text style={styles.metricValue}>{data.metrics.completionRate}%</Text>
          </View>
        </View>
      </View>

      {/* Top Performers */}
      {data.topPerformers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Performers</Text>
          {data.topPerformers.map((performer, index) => (
            <View key={performer.studentName} style={styles.topPerformerCard}>
              <Text style={styles.topPerformerRank}>#{index + 1}</Text>
              <Text style={styles.topPerformerName}>{performer.studentName}</Text>
              <Text style={styles.topPerformerStats}>
                {performer.accuracy}% | {performer.wordsLearned} words
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Student Rankings Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Student Rankings</Text>
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.col1]}>Rank</Text>
            <Text style={[styles.tableHeaderCell, styles.col2]}>Student</Text>
            <Text style={[styles.tableHeaderCell, styles.col3]}>Score</Text>
            <Text style={[styles.tableHeaderCell, styles.col4]}>Accuracy</Text>
            <Text style={[styles.tableHeaderCell, styles.col5]}>Words</Text>
          </View>

          {/* Table Rows */}
          {data.studentRankings.slice(0, 20).map((student, index) => (
            <View
              key={student.studentName}
              style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
            >
              <Text style={[styles.tableCell, styles.col1]}>{student.rank}</Text>
              <Text style={[styles.tableCell, styles.col2]}>{student.studentName}</Text>
              <Text style={[styles.tableCell, styles.col3]}>{student.score}</Text>
              <Text style={[styles.tableCell, styles.col4]}>{student.accuracy}%</Text>
              <Text style={[styles.tableCell, styles.col5]}>{student.wordsLearned}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer} fixed>
        <Text>Generated by LexiClash - {formatDate(data.generatedAt)}</Text>
      </View>
    </Page>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

/**
 * ProgressReportPDF - Main PDF Document Component
 *
 * Renders either a student or class progress report based on the data type.
 */
export function ProgressReportPDF({ data }: ProgressReportPDFProps) {
  const { t, dir } = useLanguage();
  const isRTL = dir === 'rtl';

  return (
    <Document>
      {data.type === 'student' ? (
        <StudentReport data={data} t={t} isRTL={isRTL} />
      ) : (
        <ClassReport data={data} t={t} isRTL={isRTL} />
      )}
    </Document>
  );
}

export default ProgressReportPDF;
