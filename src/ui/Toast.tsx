import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from './Button';
import { cn } from '@/lib/cn';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  kind?: 'info' | 'danger';
  message: string;
  action?: ToastAction;
}

interface ToastItem extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  push: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current;
      nextId.current += 1;
      setItems((prev) => [...prev.slice(-2), { id, ...options }]);
      window.setTimeout(() => dismiss(id), options.action ? 8000 : 5000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-5 bottom-5 z-[60] flex w-[300px] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'row-in pointer-events-auto flex items-start gap-3 border bg-surface px-4 py-3 shadow-raised',
              t.kind === 'danger' ? 'border-accent/50' : 'border-hairline',
            )}
          >
            <span aria-hidden className="mono-label mt-1 shrink-0 text-[8px] text-ink-3">
              {t.kind === 'danger' ? 'Failed' : 'Noted'}
            </span>
            <span className={cn('flex-1 font-text text-[14px] leading-snug tracking-[-0.006em]', t.kind === 'danger' ? 'text-ink' : 'text-ink-2')}>{t.message}</span>
            {t.action && (
              <Button
                size="sm"
                variant="ghost"
                className="mr-[-6px] mt-[-6px]"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </Button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
