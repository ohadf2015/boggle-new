'use client';

import { useRef, type ComponentType, type ReactNode } from 'react';
import Link from 'next/link';
import { Check, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NB_BLOCK, NB_SMALL } from './nb/nbStyles';

type MenuIcon = ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }>;

const ITEM =
  'min-h-11 cursor-pointer gap-3 rounded-neo px-3 py-2 text-start font-neo-body text-[15px] font-bold text-edu-ink hover:bg-edu-surface focus:bg-edu-surface';

function ItemBody({ icon: Icon, children }: { icon: MenuIcon; children: ReactNode }) {
  return (
    <>
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{children}</span>
    </>
  );
}

/** One "…" button per card. The panel is portalled, so a card's clipping and entrance transform can't cover it. */
export function CardOverflowMenu({ label, testId, header, children }: { label: string; testId: string; header?: ReactNode; children: ReactNode }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" data-testid={testId} aria-label={label} title={label} className={cn(NB_SMALL, NB_BLOCK.navy, 'size-11 shrink-0 px-0')}>
          <MoreHorizontal className="size-6" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        collisionPadding={12}
        className="max-h-[min(75dvh,var(--radix-dropdown-menu-content-available-height))] w-72 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-neo-lg border-[3px] border-edu-line bg-edu-surface p-1.5 text-edu-ink shadow-hard-xl"
      >
        {header}
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CardMenuAction({
  icon,
  testId,
  onSelect,
  danger = false,
  disabled = false,
  checked,
  hasPopup,
  children,
}: {
  icon: MenuIcon;
  testId?: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  checked?: boolean;
  hasPopup?: 'dialog';
  children: ReactNode;
}) {
  const toggle = checked === undefined ? {} : { role: 'menuitemcheckbox', 'aria-checked': checked };
  return (
    <DropdownMenuItem data-testid={testId} disabled={disabled} onSelect={onSelect} aria-haspopup={hasPopup} className={cn(ITEM, danger && 'text-edu-pink-ink')} {...toggle}>
      <ItemBody icon={icon}>{children}</ItemBody>
      {checked ? <Check className="size-4 shrink-0 text-edu-lime-ink" strokeWidth={3} aria-hidden="true" /> : null}
    </DropdownMenuItem>
  );
}

export function CardMenuLink({ icon, testId, href, external = false, children }: { icon: MenuIcon; testId?: string; href: string; external?: boolean; children: ReactNode }) {
  return (
    <DropdownMenuItem asChild className={ITEM}>
      {external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" data-testid={testId}>
          <ItemBody icon={icon}>{children}</ItemBody>
        </a>
      ) : (
        <Link href={href} data-testid={testId}>
          <ItemBody icon={icon}>{children}</ItemBody>
        </Link>
      )}
    </DropdownMenuItem>
  );
}

/** A row around a control that brings its own button; choosing the row presses that button. */
export function CardMenuControl({ testId, children }: { testId?: string; children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  return (
    <DropdownMenuItem
      data-testid={testId}
      onSelect={(event) => {
        event.preventDefault();
        inner.current?.querySelector('button')?.click();
      }}
      className={cn(ITEM, '[&_button]:pointer-events-none [&_button]:min-h-0 [&_button]:gap-3 [&_button]:px-0 [&_button]:text-[15px] [&_button]:text-edu-ink [&_button]:no-underline')}
    >
      {/* The inner click must not bubble back into this item, or it would select again. */}
      <div ref={inner} onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </DropdownMenuItem>
  );
}

export function CardMenuDivider() {
  return <DropdownMenuSeparator className="mx-2 my-1 bg-edu-ink/15" />;
}
