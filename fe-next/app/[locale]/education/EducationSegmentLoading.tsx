'use client';

import { usePathname } from 'next/navigation';
import { EduSkyScope } from '@/components/education/EduSkyScope';
import { EducationRouteLoading } from '@/components/teacher/hq/EducationRouteLoading';

// The sky pages this boundary covers; SEO articles under /education keep the dark loader.
const SKY_PATH = /^(?:\/[a-z]{2})?\/education(?:\/(?:access|classroom-game|live|duels|help)(?:\/.*)?)?\/?$/;

export function EducationSegmentLoading() {
  const loader = <EducationRouteLoading />;
  return SKY_PATH.test(usePathname() ?? '') ? <EduSkyScope>{loader}</EduSkyScope> : loader;
}
