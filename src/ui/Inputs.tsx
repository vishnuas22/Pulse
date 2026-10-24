import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { ChevronDown, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

const BASE =
  'bg-transparent text-ink transition-colors duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] placeholder:text-ink-3 focus:outline-none';

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="mono-label text-ink-2">
        {label}
        {hint && <span className="ml-2 tracking-normal text-ink-3 normal-case">{hint}</span>}
      </label>
      {children}
      {error && (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="text-[12px] text-accent">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ invalid = false, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={cn(
        BASE,
        'h-10 w-full border-b px-0.5 text-[15px]',
        invalid ? 'border-accent' : 'border-hairline focus:border-ink',
        className,
      )}
      {...rest}
    />
  );
}

export function Textarea({ invalid = false, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(
        BASE,
        'w-full min-h-[96px] resize-y rounded-card border bg-surface px-3 py-2.5 leading-normal',
        invalid ? 'border-accent focus:border-accent' : 'border-hairline focus:border-ink',
        className,
      )}
      {...rest}
    />
  );
}

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(
          BASE,
          'h-9 w-full appearance-none border-b pr-9 pl-0.5 text-[13px]',
          'border-hairline focus:border-ink',
          className,
        )}
        {...rest}
      />
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
    </div>
  );
}

export interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}

export function NumberField({ label, value, min, max, onChange }: NumberFieldProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const buttonClass =
    'flex h-10 w-9 items-center justify-center text-ink-2 transition-colors duration-[120ms] hover:text-ink disabled:opacity-30 disabled:hover:text-ink-2';
  return (
    <div role="group" aria-label={label} className="flex h-10 w-fit items-center rounded-input border border-hairline bg-surface">
      <button type="button" aria-label={`Decrease ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(clamp(value - 1))} className={buttonClass}>
        <Minus size={14} aria-hidden />
      </button>
      <span aria-live="polite" className="tnum w-10 text-center font-mono text-[13px] text-ink">
        {value}
      </span>
      <button type="button" aria-label={`Increase ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(clamp(value + 1))} className={buttonClass}>
        <Plus size={14} aria-hidden />
      </button>
    </div>
  );
}
