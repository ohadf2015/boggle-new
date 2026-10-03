import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../../../../../../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('analytics page says its title once', () => {
  it('suppresses the dashboard card header the page already shows', () => {
    const page = read('app/[locale]/teacher/classroom/[id]/analytics/PageClient.tsx');
    expect(page).toMatch(/<AnalyticsDashboard[\s\S]*?showHeader=\{false\}/);
    expect(page.match(/education\.analytics\.title/g)).toHaveLength(1);
  });

  it('keeps the dashboard header by default for its other mount (HQ tools sheet)', () => {
    const dash = read('components/teacher/analytics/AnalyticsDashboard.tsx');
    expect(dash).toContain('showHeader = true');
    expect(dash).toMatch(/\{showHeader && \(/);
  });

  it('labels the classroom breadcrumb instead of truncating the raw segment', () => {
    const crumbs = read('components/education/EducationBreadcrumbs.tsx');
    expect(crumbs).toMatch(/case 'classroom':\s*\n\s*label = t\('education\.header\.breadcrumbs\.classrooms'\)/);
  });

  it('fits the four view tabs at 390px: two columns on phones, labels may wrap', () => {
    const page = read('app/[locale]/teacher/classroom/[id]/analytics/PageClient.tsx');
    const list = page.match(/<TabsList[\s\S]*?>/)![0];
    expect(list).toMatch(/grid-cols-2/);
    expect(list).toMatch(/sm:grid-cols-4/);
    expect(list).toMatch(/h-auto/);
    expect(page).toMatch(/const TAB_BASE =\s[\s\S]*?whitespace-normal/);
    expect(page.match(/className=\{cn\(TAB_BASE,/g)).toHaveLength(4);
  });
});
