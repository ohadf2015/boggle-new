/** Every "see results" link (Home, class page, weekly reports) lands on the one results hub. */
export function teacherResultsHref(locale: string, classroomId?: string, section?: string): string {
  const params = new URLSearchParams();
  if (classroomId) params.set('classroomId', classroomId);
  if (classroomId && section) params.set('section', section);
  const query = params.toString().replace(/\+/g, '%20');
  return `/${locale}/teacher/reports${query ? `?${query}` : ''}`;
}
