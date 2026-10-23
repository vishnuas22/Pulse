import { cn } from '@/lib/cn';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-block size-4 animate-spin rounded-full border-2 border-ink/15 border-t-ink/60', className)}
    />
  );
}

/**
 * The four honest states of every view. Never shimmer skeletons.
 */
export function LoadingBlock({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-16 text-ink-3">
      <Spinner />
      <span className="mono-label">{label}</span>
    </div>
  );
}
