import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger' | 'danger-ghost';

/* Print-shop buttons: ink stamps for actions, quiet sans for prose gestures. */
const BASE =
  'inline-flex items-center justify-center gap-2 rounded-input font-mono text-[11px] font-medium uppercase tracking-[0.1em] transition-colors duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] disabled:pointer-events-none disabled:opacity-40';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:bg-[#312d2a]',
  outline: 'border border-ink/30 bg-transparent text-ink hover:border-ink hover:bg-paper-2',
  ghost: 'font-sans text-[13px] normal-case tracking-normal text-ink-2 hover:bg-paper-2 hover:text-ink',
  danger: 'bg-accent text-white hover:bg-accent-hover',
  'danger-ghost': 'font-sans text-[13px] normal-case tracking-normal text-accent hover:bg-[#f6e8e2]',
};

const SIZES = {
  md: 'h-9 px-3.5',
  sm: 'h-8 px-2.5 text-[10px]',
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
}

export function Button({ variant = 'primary', size = 'md', className, type, ...rest }: ButtonProps) {
  return <button type={type ?? 'button'} className={cn(BASE, SIZES[size], VARIANTS[variant], className)} {...rest} />;
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  danger?: boolean;
}

/** Icon-only control — the label carries the accessible name, never the icon. */
export function IconButton({ label, danger = false, className, type, ...rest }: IconButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-input transition-colors duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] disabled:pointer-events-none disabled:opacity-40',
        danger ? 'text-ink-3 hover:bg-[#f6e8e2] hover:text-accent' : 'text-ink-3 hover:bg-paper-2 hover:text-ink',
        className,
      )}
      {...rest}
    />
  );
}
