import { TeacherStudentView } from '@/components/teacher/classroom/TeacherStudentView';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function StudentViewPage({ params }: PageProps) {
  const { id } = await params;
  return <TeacherStudentView classroomId={id} />;
}
