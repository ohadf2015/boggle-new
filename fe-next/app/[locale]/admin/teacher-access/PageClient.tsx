'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { TeacherAccessQueue } from '@/components/admin/TeacherAccessQueue';

export function PageClient() {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !profile?.is_admin) {
      router.replace('/');
    }
  }, [profile?.is_admin, loading, router]);

  if (!profile?.is_admin) return null;

  return <TeacherAccessQueue />;
}
