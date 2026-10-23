import { Check } from 'lucide-react';
import type { AccentKey } from '@/api/types';
import { ACCENT_CLASSES } from '@/lib/accents';
import { cn } from '@/lib/cn';

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
        'flex size-7 shrink-0 items-center justify-center rounded-full border transition-[border-color,background-color] duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] hover:border-ink disabled:opacity-50',
        checked ? ACCENT_CLASSES[accent].filled : 'border-ink-3 bg-transparent',
      )}
    >
      {checked && <Check size={14} strokeWidth={2.5} className="text-white" aria-hidden />}
    </button>
  );
}
