import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';

export type DrawerAccent = 'cyan' | 'pink' | 'lime' | 'purple' | 'yellow' | 'white';

const ICON_TILE: Record<DrawerAccent, string> = {
    cyan: 'bg-neo-cyan/15 text-neo-cyan border-neo-cyan/40',
    pink: 'bg-neo-pink/15 text-neo-pink border-neo-pink/40',
    lime: 'bg-neo-lime/15 text-neo-lime border-neo-lime/40',
    purple: 'bg-neo-purple/20 text-neo-purple border-neo-purple/50',
    yellow: 'bg-neo-yellow/15 text-neo-yellow border-neo-yellow/40',
    white: 'bg-neo-white/10 text-neo-white border-neo-white/25',
};

const TILE_FILL: Record<Exclude<DrawerAccent, 'white'>, string> = {
    cyan: 'bg-neo-cyan',
    pink: 'bg-neo-pink',
    lime: 'bg-neo-lime',
    purple: 'bg-neo-purple',
    yellow: 'bg-neo-yellow',
};

export function DrawerSection({ label, children, className, testId }: {
    label?: ReactNode;
    children: ReactNode;
    className?: string;
    testId?: string;
}) {
    return (
        <section className={cn('flex flex-col gap-2', className)} data-testid={testId}>
            {label && (
                <h3 className="px-1 text-[11px] font-black uppercase tracking-[0.14em] text-neo-white/70">
                    {label}
                </h3>
            )}
            {children}
        </section>
    );
}

/** A bordered card whose rows are separated by hairlines, so a group reads as one unit. */
export function DrawerGroup({ children }: { children: ReactNode }) {
    return (
        <div className="overflow-hidden rounded-neo border-2 border-neo-white/15 bg-neo-white/[0.04] divide-y divide-neo-white/10">
            {children}
        </div>
    );
}

const ROW_CLASS = cn(
    'flex w-full items-center gap-3 px-3 py-2.5 min-h-12 text-start',
    'text-sm font-bold text-neo-white',
    'hover:bg-neo-white/[0.06] active:bg-neo-white/10',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neo-cyan',
    'transition-colors duration-100',
);

function RowBody({ icon, accent, children, trailing, chevron }: {
    icon: ReactNode;
    accent: DrawerAccent;
    children: ReactNode;
    trailing?: ReactNode;
    chevron: boolean;
}) {
    return (
        <>
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2', ICON_TILE[accent])}>
                {icon}
            </span>
            <span className="min-w-0 flex-1 truncate">{children}</span>
            {trailing}
            {chevron && <DirectionalIcon icon={ChevronRight} className="h-4 w-4 shrink-0 text-neo-white/40" />}
        </>
    );
}

type RowProps = {
    icon: ReactNode;
    accent: DrawerAccent;
    children: ReactNode;
    trailing?: ReactNode;
};

export function DrawerRowLink({ href, onClick, external, ariaLabel, ...body }: RowProps & {
    href: string;
    onClick?: () => void;
    external?: boolean;
    ariaLabel?: string;
}) {
    if (external) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} aria-label={ariaLabel} className={ROW_CLASS}>
                <RowBody {...body} chevron />
            </a>
        );
    }
    return (
        <Link href={href} onClick={onClick} className={ROW_CLASS}>
            <RowBody {...body} chevron />
        </Link>
    );
}

export function DrawerRowButton({ onClick, ...body }: RowProps & { onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} className={ROW_CLASS}>
            <RowBody {...body} chevron />
        </button>
    );
}

/** A row that holds its own control (e.g. the language picker) instead of navigating. */
export function DrawerRowStatic({ icon, accent, children, control }: Omit<RowProps, 'trailing'> & { control: ReactNode }) {
    return (
        <div className={cn(ROW_CLASS, 'hover:bg-transparent active:bg-transparent')}>
            <RowBody icon={icon} accent={accent} chevron={false} trailing={<span className="shrink-0">{control}</span>}>
                {children}
            </RowBody>
        </div>
    );
}

/** Solid electric tile for the drawer's main destinations. */
export function DrawerTile({ href, onClick, icon, accent, label, meta, badge }: {
    href: string;
    onClick: () => void;
    icon: ReactNode;
    accent: Exclude<DrawerAccent, 'white'>;
    label: ReactNode;
    meta?: ReactNode;
    badge?: ReactNode;
}) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={cn(
                'relative flex min-h-[72px] flex-col justify-between gap-2 rounded-neo p-3',
                'border-3 border-neo-black text-neo-black shadow-hard-sm',
                'hover:-translate-y-px hover:shadow-hard active:translate-y-px active:shadow-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-white focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
                'transition-[transform,box-shadow] duration-100',
                TILE_FILL[accent],
            )}
        >
            <span className="flex items-center justify-between gap-2">
                {icon}
                {meta && <span className="text-[11px] font-black tabular-nums">{meta}</span>}
            </span>
            <span className="truncate text-sm font-black leading-tight">{label}</span>
            {badge}
        </Link>
    );
}

/** Small pill used for low-priority footer links (support, social, cookies). */
export const DRAWER_CHIP_CLASS = cn(
    'flex items-center gap-1.5 rounded-full px-3 py-1.5 min-h-9',
    'border-2 border-neo-white/15 bg-neo-white/[0.04]',
    'text-xs font-bold text-neo-white',
    'hover:border-neo-white/30 hover:bg-neo-white/[0.08]',
    'transition-colors duration-100',
);
