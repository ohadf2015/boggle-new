'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { pressClasses, type PressLip } from './pressClasses';

export { pressClasses, type PressLip };

export interface PressButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  lip?: PressLip;
}

export const PressButton = forwardRef<HTMLButtonElement, PressButtonProps>(function PressButton(
  { lip = 4, className = '', type = 'button', ...rest },
  ref,
) {
  return <button ref={ref} type={type} className={`${pressClasses(lip)} ${className}`} {...rest} />;
});
