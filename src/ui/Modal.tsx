import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { Spinner } from './Spinner';
import { cn } from '@/lib/cn';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const previous = document.activeElement as HTMLElement | null;

    const first = panel.querySelector<HTMLElement>('[data-autofocus]') ?? panel;
    first.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || document.activeElement === el,
      );
      if (items.length === 0) return;
      const current = items.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey
        ? current <= 0
          ? items.length - 1
          : current - 1
        : current === -1 || current === items.length - 1
          ? 0
          : current + 1;
      e.preventDefault();
      items[next].focus();
    };

    panel.addEventListener('keydown', onKey);
    return () => {
      panel.removeEventListener('keydown', onKey);
      previous?.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="backdrop-in absolute inset-0 bg-ink/25" onMouseDown={onCloseRef.current} aria-hidden />
      <div className="absolute inset-0 overflow-y-auto px-4 pb-10 pt-[10vh]">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
          className={cn(
            'modal-in relative mx-auto w-full max-w-[440px] rounded-card border border-hairline bg-surface p-6 shadow-raised outline-none',
            className,
          )}
        >
          <h2 className="font-serif text-[22px] font-normal leading-tight text-ink">{title}</h2>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({ open, onClose, title, body, confirmLabel = 'Delete', onConfirm }: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) setPending(false);
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-[400px]">
      <div className="text-[14px] leading-normal text-ink-2">{body}</div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" data-autofocus onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            try {
              await onConfirm();
              onClose();
            } catch {
              // failure already surfaced by the caller; keep the dialog open
            } finally {
              setPending(false);
            }
          }}
        >
          {pending && <Spinner className="size-3.5 border-t-white/70" />}
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
