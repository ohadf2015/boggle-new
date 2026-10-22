import { ReactNode } from 'react';
import { CheckoutReturnCapture } from '@/components/teacher/CheckoutReturnCapture';

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <CheckoutReturnCapture />
      {children}
    </>
  );
}
