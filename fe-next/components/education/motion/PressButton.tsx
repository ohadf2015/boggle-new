'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type PressLip = 2 | 4;

const LIP: Record<PressLip, string> = {
  4: 'shadow-[0_4px_0_0] active:translate-y-[4px]',
  2: 'shadow-[0_2px_0_0] active:translate-y-[2px]',
};

export function pressClasses(lip: PressLip = 4): string {
  return [
    LIP[lip],
    'shadow-neo-black active:shadow-none',
    'transition-[filter] duration-200 [@media(hover:hover)]:hover:brightness-110',
    'disabled:pointer-events-none disabled:shadow-none',
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
  ].join(' ');
}

export interface PressButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  lip?: PressLip;
}

export const PressButton = forwardRef<HTMLButtonElement, PressButtonProps>(function PressButton(
  { lip = 4, className = '', type = 'button', ...rest },
  ref,
) {
  return <button ref={ref} type={type} className={`${pressClasses(lip)} ${className}`} {...rest} />;
});
