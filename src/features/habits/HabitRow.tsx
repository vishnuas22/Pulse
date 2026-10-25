import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { DateKey, Habit } from '@/api/types';
import { ACCENT_CLASSES } from '@/lib/accents';
import { cn } from '@/lib/cn';
import { streakLabel } from '@/lib/stats';
import { todayKey } from '@/lib/date';
import { CheckCircle } from './CheckCircle';
import type { ReactNode } from 'react';

export interface HabitRowProps {
  habit: Habit;
  dates: DateKey[];
  pending: boolean;
  onToggle?: () => void;
  /** Right-side controls (Manage view). Absent = chevron affordance (Today). */
  actions?: ReactNode;
  /** Render in archived mode: no circle, no streak, dimmed lead dot. */
  archived?: boolean;
  showTarget?: boolean;
  /** Ledger entry number — a small mono index, like line numbers in a register. */
  index?: number;
}

export function HabitRow({
  habit,
  dates,
  pending,
  onToggle,
  actions,
  archived = false,
  showTarget = false,
  index,
}: HabitRowProps) {
  const navigate = useNavigate();
  const label = streakLabel(dates);
  const checked = new Set(dates).has(todayKey());

  return (
    <div
      className={cn(
        'row-in group flex items-center gap-4 border-b border-hairline py-4 pr-1 pl-2 transition-colors duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] hover:bg-paper-2',
        archived && 'opacity-80',
      )}
    >
      {typeof index === 'number' ? (
        <span aria-hidden className="tnum w-5 shrink-0 font-mono text-[10px] text-ink-3">
          {String(index + 1).padStart(2, '0')}
        </span>
      ) : null}

      {archived ? (
        <span aria-hidden className={cn('size-2 shrink-0 rounded-full', ACCENT_CLASSES[habit.accent].dot)} />
      ) : (
        <CheckCircle checked={checked} accent={habit.accent} name={habit.name} pending={pending} onToggle={onToggle ?? (() => {})} />
      )}

      <button
        type="button"
        onClick={() => navigate(`/habits/${habit.id}`)}
        className="min-w-0 flex-1 truncate text-left font-text text-[17px] font-semibold leading-tight tracking-[-0.006em] text-ink decoration-ink/30 underline-offset-4 hover:underline"
      >
        {habit.name}
      </button>

      <div className="flex shrink-0 items-center gap-3 font-mono text-[12px]">
        {showTarget && <span className="tnum hidden text-ink-3 sm:inline">{habit.targetPerWeek}/wk</span>}
        {label && (
          <span className={cn('tnum', checked ? 'font-medium text-accent' : 'text-ink-3')}>
            {archived ? null : label.text}
          </span>
        )}
      </div>

      {actions ? (
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] group-focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-100">
          {actions}
        </div>
      ) : (
        <ChevronRight size={16} className="shrink-0 text-ink-3 transition-colors duration-[120ms] group-hover:text-ink" aria-hidden />
      )}
    </div>
  );
}
