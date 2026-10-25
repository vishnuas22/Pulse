import { useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { Plus } from 'lucide-react';
import { useHabits } from '@/app/HabitsProvider';
import { useAppUi } from '@/app/ui-context';
import { Button } from '@/ui/Button';
import { EmptyState, ErrorState } from '@/ui/EmptyState';
import { LoadingBlock } from '@/ui/Spinner';
import { useToast } from '@/ui/Toast';
import { formatHuman, isoWeek, todayKey } from '@/lib/date';
import { prefersReducedMotion } from '@/features/studio/physics';
import { HabitRow } from './HabitRow';

/** How long the stamp must be held — the borrowed patience of a wax seal. */
const SEAL_MS = 800;

/** "Thursday, 23 October" → weekday / day / month-rest, typeset separately. */
function splitHumanDate(human: string): { weekday: string; day: string; rest: string } | null {
  const m = human.match(/^([^,]+),\s*(\d+)\s+(.+)$/);
  if (!m) return null;
  return { weekday: m[1], day: m[2], rest: m[3] };
}

export function TodayView() {
  const { status, error, habits, logs, pending, toggle, refresh, closed, setDayClosed } = useHabits();
  const { openCreate } = useAppUi();
  const toast = useToast();
  const today = todayKey();
  /* The closing ceremony: idle → arming (a held stamp) → confirm (quick tap).
     "Sealed" itself is derived from the provider's closed list. */
  const [seal, setSeal] = useState<'idle' | 'arming' | 'confirm' | 'busy'>('idle');
  const sealDownAt = useRef(0);
  const sealWasConfirm = useRef(false);

  if (status === 'loading') return <LoadingBlock label="Loading today" />;
  if (status === 'error') return <ErrorState message={error} onRetry={() => void refresh()} />;

  const active = habits
    .filter((h) => h.archivedAt === null)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const done = active.filter((h) => (logs[h.id] ?? []).includes(today)).length;
  const pct = active.length === 0 ? 0 : Math.round((done / active.length) * 100);
  const date = splitHumanDate(formatHuman(today));

  const sealedToday = closed.includes(today);

  const commitSeal = async () => {
    if (sealedToday || seal === 'busy') return;
    sealDownAt.current = 0;
    setSeal('busy');
    try {
      await setDayClosed(today, true);
      toast.push({
        message:
          done === active.length
            ? 'Today sealed — every ritual honored.'
            : done === 0
              ? 'Today sealed unkept.'
              : `Today sealed — ${done} of ${active.length} met.`,
      });
    } catch (e) {
      toast.push({ kind: 'danger', message: e instanceof Error ? e.message : 'Could not seal the day.' });
    } finally {
      setSeal('idle');
    }
  };

  const reopenToday = async () => {
    try {
      await setDayClosed(today, false);
      toast.push({ message: 'Reopened. The plate is editable again.' });
    } catch (e) {
      toast.push({ kind: 'danger', message: e instanceof Error ? e.message : 'Could not reopen the day.' });
    }
  };

  const onSealDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || !e.isPrimary) return; // only the left, primary pointer charges the stamp
    if (sealedToday || seal === 'busy') return;
    sealDownAt.current = performance.now();
    sealWasConfirm.current = seal === 'confirm';
    // Under reduced motion the bar can't travel, so the ceremony is the tap-twice path.
    if (!prefersReducedMotion()) setSeal('arming');
  };

  /* Commit rides the up-event (WCAG 2.5.2) — no setTimeout race:
     a full hold commits; a quick release asks for an explicit confirm. */
  const onSealUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || !e.isPrimary) return;
    if (seal === 'busy' || sealDownAt.current === 0) return;
    const held = performance.now() - sealDownAt.current >= SEAL_MS;
    const wasConfirm = sealWasConfirm.current;
    sealDownAt.current = 0;
    sealWasConfirm.current = false;
    /* Touch captures implicitly, so leave/cancel can't fire mid-gesture — judge
       a drifted release against the stamp's bounds, same semantics as mouse. */
    const r = e.currentTarget.getBoundingClientRect();
    const inside =
      e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) {
      setSeal(wasConfirm ? 'confirm' : 'idle');
      return;
    }
    if (held || wasConfirm) void commitSeal();
    else setSeal('confirm');
  };

  /* An aborted gesture disarms honestly: an armed confirm (intent already
     expressed once) stays one tap away; a bare arm dies completely. */
  const onSealAbort = () => {
    if (seal === 'busy' || sealDownAt.current === 0) return;
    sealDownAt.current = 0;
    const wasConfirm = sealWasConfirm.current;
    sealWasConfirm.current = false;
    setSeal(wasConfirm ? 'confirm' : 'idle');
  };

  /* The armed state expires when focus leaves — no sticky stamp. */
  const onSealExpire = () => {
    if (seal === 'busy' || sealedToday) return;
    sealDownAt.current = 0;
    sealWasConfirm.current = false;
    if (seal !== 'idle') setSeal('idle');
  };

  // detail === 0 marks keyboard/AT activation (no pointer events precede it);
  // pointer taps resolve through the down/up pair above.
  const onSealClick = (e: MouseEvent) => {
    if (e.detail !== 0 || sealedToday || seal === 'busy') return;
    if (seal === 'confirm') void commitSeal();
    else setSeal('confirm');
  };

  return (
    <section>
      <header className="pt-12 pb-10">
        <div className="flex items-end justify-between gap-8 border-b-2 border-ink pb-8">
          <div className="min-w-0">
            <p className="mono-label text-ink-3">The daily record · week {isoWeek(today)}</p>
            <h1 className="mt-4 font-display text-[56px] font-semibold leading-[1.02] tracking-[-0.015em] text-ink sm:text-[72px]">
              <span className="block">{date ? date.weekday : formatHuman(today)}</span>
              {date && (
                <span className="block">
                  {date.day}&nbsp;
                  <span className="font-normal text-ink-2">{date.rest}</span>
                </span>
              )}
            </h1>
          </div>

          <div className="shrink-0 text-right">
            <p className="mono-label text-ink-3">Checked in</p>
            <p aria-hidden className="tnum mt-2 font-display font-semibold leading-[0.85] tracking-[-0.015em]" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <span className="text-[64px] text-ink sm:text-[76px]">{done}</span>
              <span className="text-[30px] text-ink-3 sm:text-[36px]">/{active.length}</span>
            </p>
            <p className="tnum mt-3 font-mono text-[12px] text-ink-2">
              {done} of {active.length} checked in
              {active.length > 0 && done === active.length ? ' — all clear' : ''}
            </p>
          </div>
        </div>
      </header>

      {active.length === 0 ? (
        <EmptyState
          title="Nothing on record."
          body="Create the first habit. Check in on it here, every day."
          action={
            <Button onClick={openCreate}>
              <Plus size={14} aria-hidden />
              New habit
            </Button>
          }
        />
      ) : (
        <>
          <div className="border-t border-hairline">
            {active.map((habit, i) => (
              <HabitRow
                key={habit.id}
                index={i}
                habit={habit}
                dates={logs[habit.id] ?? []}
                pending={pending.includes(habit.id)}
                onToggle={() => {
                  void toggle(habit.id).catch((e: unknown) => {
                    toast.push({
                      kind: 'danger',
                      message: e instanceof Error ? e.message : 'Could not save the check-in.',
                    });
                  });
                }}
              />
            ))}
          </div>

          {/* the bookkeeper's closing rule */}
          <div className="flex items-baseline justify-between border-b-2 border-ink pt-4">
            <p className="mono-label text-ink-3">Day total</p>
            <p className="tnum font-mono text-[13px] text-ink">
              {done}/{active.length} <span className="text-ink-3">· {pct}%</span>
            </p>
          </div>

          {/* the day's seal — hold the stamp, or tap twice; always reopenable */}
          <div className="flex items-baseline justify-between pt-4" aria-live="polite">
            {sealedToday ? (
              <>
                <div className="flex items-baseline gap-3">
                  <p className="mono-label text-accent">Sealed</p>
                  <p className="tnum font-mono text-[12px] text-ink-2">
                    {done}/{active.length} on record
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void reopenToday()}
                  className="font-text text-[12px] font-semibold tracking-[-0.006em] text-ink-3 underline-offset-4 transition-colors hover:text-ink hover:underline"
                >
                  Reopen
                </button>
              </>
            ) : (
              <>
                <p className="mono-label text-ink-3">Close today</p>
                <Button
                  variant="outline"
                  data-seal={seal === 'busy' ? 'busy' : seal}
                  className="relative select-none touch-manipulation overflow-hidden data-[seal=confirm]:border-ink"
                  onClick={onSealClick}
                  onPointerDown={onSealDown}
                  onPointerUp={onSealUp}
                  onPointerLeave={onSealAbort}
                  onPointerCancel={onSealAbort}
                  onBlur={onSealExpire}
                  disabled={seal === 'busy'}
                >
                  {seal === 'confirm' ? 'Tap again to seal' : 'Seal today'}
                  <span aria-hidden className="seal-bar absolute inset-x-0 bottom-0 h-[2px] bg-accent" />
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
