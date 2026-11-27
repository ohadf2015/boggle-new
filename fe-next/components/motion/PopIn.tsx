'use client';

import * as React from 'react';
import { AdaptiveMotion } from './AdaptiveMotion';
import { MOTION, STAGGER_STEP } from './tokens';

type PopElement = 'div' | 'span' | 'li';

type DomOnly = 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration';

export interface PopInProps extends Omit<React.HTMLAttributes<HTMLElement>, DomOnly> {
  as?: PopElement;
  index?: number;
  delay?: number;
  // Off by default: an opacity-0 first paint can stick or hold back LCP.
  fade?: boolean;
}

export function PopIn({ as = 'div', index = 0, delay = 0, fade = false, children, ...rest }: PopInProps) {
  const Comp = AdaptiveMotion[as];
  return (
    <Comp
      initial={{ scale: 0.92, y: 8, ...(fade ? { opacity: 0 } : null) }}
      animate={{ scale: 1, y: 0, ...(fade ? { opacity: 1 } : null) }}
      transition={{ ...MOTION.pop, delay: delay + index * STAGGER_STEP }}
      {...rest}
    >
      {children}
    </Comp>
  );
}

export interface StaggerProps extends Omit<React.HTMLAttributes<HTMLElement>, DomOnly> {
  as?: 'div' | 'ul' | 'ol';
  itemAs?: PopElement;
  delay?: number;
  fade?: boolean;
  itemClassName?: string;
}

export function Stagger({ as = 'div', itemAs = 'div', delay = 0, fade, itemClassName, children, ...rest }: StaggerProps) {
  const Comp = as;
  return (
    <Comp {...rest}>
      {React.Children.toArray(children).map((child, i) => (
        <PopIn key={React.isValidElement(child) && child.key != null ? child.key : i} as={itemAs} index={i} delay={delay} fade={fade} className={itemClassName}>
          {child}
        </PopIn>
      ))}
    </Comp>
  );
}
