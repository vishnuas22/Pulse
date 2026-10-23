import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
  align?: 'center' | 'start';
}

export function EmptyState({ title, body, action, className, align = 'center' }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col gap-3 py-16', align === 'center' ? 'items-center text-center' : 'items-start', className)}>
      <h2 className="font-serif text-[30px] leading-tight text-ink">{title}</h2>
      {body && <p className="max-w-sm text-[14px] text-ink-2">{body}</p>}
      {action}
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
          className="mt-1 h-8 rounded-input border border-hairline bg-surface px-2.5 text-[12px] font-medium text-ink transition-colors duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] hover:border-ink-3"
        >
          Retry
        </button>
      }
    />
  );
}
