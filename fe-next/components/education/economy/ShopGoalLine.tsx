'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { shopGoal } from './shopGoal';

/** "Save for X" with a bar. Cash the student has is the only input; the server owns the number. */
export default function ShopGoalLine({ cash }: { cash: number }) {
  const { t } = useLanguage();
  const goal = shopGoal(cash);
  const name = t(`economy.shop.${goal.id}.name`);
  const pct = goal.kind === 'save' ? Math.min(100, Math.round((cash / goal.cost) * 100)) : 100;

  return (
    <div data-testid="shop-goal" className="flex flex-col gap-1">
      <p className="text-base font-bold">
        {goal.kind === 'save' ? t(`economy.goal.save.${goal.id}`, { missing: goal.missing }) : t('economy.goal.ready', { name })}
      </p>
      <div
        role="progressbar"
        aria-label={name}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-3 w-full overflow-hidden rounded-full border-2 border-neo-cream/40 bg-white/10"
      >
        <div className="h-full bg-neo-lime transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
