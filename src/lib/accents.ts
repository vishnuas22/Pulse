import type { AccentKey } from '@/api/types';

/** Tailwind classes per swatch — literal strings so the compiler sees them. */
export const ACCENT_CLASSES: Record<AccentKey, { dot: string; filled: string }> = {
  ember: { dot: 'bg-[var(--a-ember)]', filled: 'bg-[var(--a-ember)] border-[var(--a-ember)]' },
  moss: { dot: 'bg-[var(--a-moss)]', filled: 'bg-[var(--a-moss)] border-[var(--a-moss)]' },
  honey: { dot: 'bg-[var(--a-honey)]', filled: 'bg-[var(--a-honey)] border-[var(--a-honey)]' },
  pine: { dot: 'bg-[var(--a-pine)]', filled: 'bg-[var(--a-pine)] border-[var(--a-pine)]' },
  graphite: { dot: 'bg-[var(--a-graphite)]', filled: 'bg-[var(--a-graphite)] border-[var(--a-graphite)]' },
};
