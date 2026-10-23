import { useMemo } from 'react';
import type { DateKey } from '@/api/types';
import { addDays, formatHuman, formatMonth, todayKey, weekdayOfMonday } from '@/lib/date';
import { cn } from '@/lib/cn';

const WEEKS = 17;
const ROW_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface Cell {
  date: DateKey;
  col: number;
  row: number;
  filled: boolean;
  future: boolean;
}

/**
 * GitHub-adjacent history grid, but restrained: paper cells and ONE accent.
 * Binary in v1 (a day is done or not); value-scale tokens are ready in
 * tokens.css for v2 when check-ins can carry values.
 */
export function HistoryGrid({ logs }: { logs: DateKey[] }) {
  const today = todayKey();

  const { cells, monthLabels } = useMemo(() => {
    const set = new Set(logs);
    const base = addDays(today, -(WEEKS - 1) * 7);
    const start = addDays(base, -weekdayOfMonday(base));

    const outCells: Cell[] = [];
    const labels: Array<{ col: number; label: string; key: DateKey }> = [];
    let lastMonth = '';
    for (let w = 0; w < WEEKS; w += 1) {
      const monday = addDays(start, w * 7);
      const month = formatMonth(monday);
      const showLabel = w === 0 || (month !== lastMonth && weekdayOfMonday(monday) === 0);
      if (showLabel && month !== lastMonth) {
        labels.push({ col: w, label: month, key: monday });
        lastMonth = month;
      }
      for (let r = 0; r < 7; r += 1) {
        const date = addDays(start, w * 7 + r);
        outCells.push({
          date,
          col: w,
          row: r,
          filled: set.has(date),
          future: date > today,
        });
      }
    }
    return { cells: outCells, monthLabels: labels };
  }, [logs, today]);

  const filledCount = cells.filter((c) => c.filled).length;

  return (
    <figure className="flex flex-col gap-3">
      <div className="flex gap-2.5">
        <div aria-hidden className="grid w-3 gap-y-[3px] pt-[14px]">
          {ROW_LABELS.map((l, i) => (
            <span
              key={i}
              className="h-[11px] font-mono text-[9px] leading-[11px] text-ink-3"
            >
              {i % 2 === 0 ? l : ''}
            </span>
          ))}
        </div>
        <div
          role="img"
          aria-label={`Check-in history for the last ${WEEKS} weeks: ${filledCount} of ${cells.filter((c) => !c.future).length} days checked in.`}
          className="min-w-0 flex-1 overflow-x-auto"
        >
          <div
            className="grid gap-[3px]"
            style={{ gridTemplateColumns: `repeat(${WEEKS}, 11px)`, gridTemplateRows: `12px repeat(7, 11px)` }}
          >
            {monthLabels.map((m) => (
              <span
                key={m.key}
                style={{ gridColumn: m.col + 1, gridRow: 1 }}
                className="font-mono text-[9px] leading-[12px] whitespace-nowrap text-ink-3"
              >
                {m.label}
              </span>
            ))}
            {cells.map((c) =>
              c.future ? null : (
                <span
                  key={c.date}
                  title={c.filled ? `${formatHuman(c.date)} — checked in` : `${formatHuman(c.date)} — no check-in`}
                  style={{ gridColumn: c.col + 1, gridRow: c.row + 2 }}
                  className={cn('size-[11px] rounded-[2px]', c.filled ? 'bg-[var(--heat-5)]' : 'bg-[var(--heat-0)]')}
                />
              ),
            )}
          </div>
        </div>
      </div>
      <figcaption className="mono-label text-ink-3">
        Last {WEEKS} weeks · {filledCount} check-ins
      </figcaption>
    </figure>
  );
}
