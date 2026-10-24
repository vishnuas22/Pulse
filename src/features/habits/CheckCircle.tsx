import { Check } from 'lucide-react';
import type { AccentKey } from '@/api/types';
import { ACCENT_CLASSES } from '@/lib/accents';
import { cn } from '@/lib/cn';

/** The day's ledger stamp: a seal that drops onto the line when checked. */
export function CheckCircle({
  checked,
  accent,
  name,
  pending,
  onToggle,
}: {
  checked: boolean;
  accent: AccentKey;
  name: string;
  pending: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={checked ? `Remove today's check-in for ${name}` : `Check in for ${name}`}
      disabled={pending}
      title={checked ? 'Remove check-in for today' : 'Check in for today'}
      onClick={onToggle}
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] active:scale-90 disabled:opacity-50',
        checked ? cn('stamp-in', ACCENT_CLASSES[accent].filled) : 'border-ink/30 bg-transparent hover:border-ink hover:bg-paper-2',
      )}
    >
      {checked && <Check size={15} strokeWidth={3} className="text-paper" aria-hidden />}
    </button>
  );
}
