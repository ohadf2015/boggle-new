import type { ReactNode } from 'react';

/** Marks a classroom route root; app/edu-sky.css flips the edu-* tokens while it is mounted. */
export function EduSkyScope({ children }: { children: ReactNode }) {
  return (
    <div data-edu-theme="sky" className="contents">
      {children}
    </div>
  );
}
