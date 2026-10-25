import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
  align?: 'center' | 'start';
}

/** An empty record, typeset: a rule, a serif line, a serif aside. Left-set by default. */
export function EmptyState({ title, body, action, className, align = 'start' }: EmptyStateProps) {
  const centered = align === 'center';
  return (
    <div className={cn('flex flex-col gap-3 py-16', centered ? 'items-center text-center' : 'items-start', className)}>
      <div aria-hidden className={cn('h-px w-14 bg-ink/50', centered && 'mx-auto')} />
      <h2 className="font-display text-[34px] font-semibold leading-tight tracking-[-0.005em] text-ink">{title}</h2>
      {body && <p className="max-w-md font-text text-[15px] leading-normal tracking-[-0.006em] text-ink-2">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <EmptyState
      title="Could not load."
      body={message ?? 'Something failed while loading. Try again.'}
      action={
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 h-8 rounded-input border border-ink/30 bg-transparent px-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink transition-colors duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] hover:border-ink hover:bg-paper-2"
        >
          Retry
        </button>
      }
    />
  );
}
