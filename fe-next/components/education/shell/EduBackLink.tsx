'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';
import { isTeacherProfile } from '@/lib/education/teacherRole';
import { educationBackHref, type EducationRole } from '@/lib/navigation/educationBackHref';

const EDU_SECTIONS = new Set(['teacher', 'student', 'education', 'join']);

export interface ResolveEduBackHrefParams {
  pathname: string | null | undefined;
  locale: string;
  role: EducationRole;
  href?: string;
}

function staysInEdu(href: string, locale: string): boolean {
  const [head, section] = href.split('?')[0].split('#')[0].split('/').filter(Boolean);
  return head === locale && EDU_SECTIONS.has(section ?? '');
}

export function resolveEduBackHref({ pathname, locale, role, href }: ResolveEduBackHrefParams): string {
  if (href && staysInEdu(href, locale)) return href;
  return educationBackHref({ pathname, locale, role });
}

export interface EduBackLinkProps {
  /** An in-edu target; anything outside edu falls back to the viewer's hub. */
  href?: string;
  className?: string;
}

export function EduBackLink({ href, className }: EduBackLinkProps) {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const pathname = usePathname();
  const role: EducationRole = isTeacherProfile(profile) ? 'teacher' : profile?.user_role === 'student' ? 'student' : null;
  const target = resolveEduBackHref({ pathname, locale: language, role, href });

  return (
    <Link
      href={target}
      aria-label={t('common.back')}
      data-testid="edu-back-link"
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-neo border-3 border-neo-cream bg-neo-navy text-neo-white shadow-hard-sm',
        'transition-transform duration-100 active:translate-y-0.5 active:shadow-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan',
        className,
      )}
    >
      <DirectionalIcon icon={ArrowLeft} className="size-5" />
    </Link>
  );
}

export default EduBackLink;
