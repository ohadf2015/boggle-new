import type { ReactNode } from 'react';

interface PhoneFrameProps {
  /** Text direction of the student's UI — the frame itself is direction-neutral. */
  dir: 'ltr' | 'rtl';
  children: ReactNode;
}

/**
 * A phone-shaped bezel around a mock student screen. Dark-only surface, so the
 * navy is hardcoded (no cream/dark pair — see recurring-pitfalls class 5).
 */
export function PhoneFrame({ dir, children }: PhoneFrameProps) {
  return (
    <div
      data-testid="student-preview-phone"
      className="mx-auto w-[272px] shrink-0 rounded-[28px] border-4 border-neo-black bg-neo-black p-2 shadow-hard-lg"
    >
      <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-neo-navy-light" aria-hidden="true" />
      <div
        dir={dir}
        className="h-[480px] overflow-y-auto rounded-[20px] bg-neo-navy p-3 text-neo-white"
      >
        {children}
      </div>
    </div>
  );
}
