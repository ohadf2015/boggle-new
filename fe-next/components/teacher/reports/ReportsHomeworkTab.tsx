'use client';

/**
 * The homework tab of the teacher reports page: the assignment grid (free),
 * per-assignment completion counts (free), the assignment progress table, and
 * the gated per-student progress matrix. Extracted from
 * app/[locale]/teacher/reports/PageClient.tsx so that file stays under its
 * 500-line budget; it must stay a child of the page's <Tabs> to receive the
 * tab context.
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { TabsContent } from '@/components/ui/tabs';
import { ClassAssignmentGrid } from '@/components/teacher/reports/ClassAssignmentGrid';
import { AssignmentCompletionReport } from '@/components/teacher/reports/AssignmentCompletionReport';
import { AssignmentProgressReport } from '@/components/teacher/reports/AssignmentProgressReport';
import { AssignmentProgressMatrix } from '@/components/teacher/reports/AssignmentProgressMatrix';
import { SectionDisclosure } from '@/components/teacher/reports/FullReportDisclosure';

export function ReportsHomeworkTab({ classroomId, classroomName }: { classroomId: string; classroomName: string }) {
  const { t } = useLanguage();
  return (
    <TabsContent value="homework" className="space-y-3">
      <ClassAssignmentGrid classroomId={classroomId} classroomName={classroomName} />
      <SectionDisclosure section="assignments">
        <div className="space-y-4">
          <AssignmentCompletionReport classroomId={classroomId} />
          <AssignmentProgressReport classroomId={classroomId} classroomName={classroomName} />
          <AssignmentProgressMatrix classroomId={classroomId} classroomName={classroomName} />
        </div>
      </SectionDisclosure>
    </TabsContent>
  );
}

export default ReportsHomeworkTab;
