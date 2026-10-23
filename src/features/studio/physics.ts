/* Hand-rolled physics for the Studio. No animation library — a spring-damper
   solver (semi-implicit Euler, clamped dt) driving refs, DOM writes, or state.
   k has units 1/s², c 1/s; near-critical c ≈ 2√k gives a premium settle. */

import { useEffect, useRef, useState } from "react";

export interface SpringConfig {
  stiffness: number;
  damping: number;
  onRest?: () => void;
}

export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export class Spring {
  value: number;
  velocity = 0;
  target: number;

  private cfg: SpringConfig;
  private frame: Frame = null;
  private last = 0;
  private settled = true;

  constructor(value: number, cfg: SpringConfig) {
    this.value = value;
    this.target = value;
    this.cfg = cfg;
  }

  /** Called from the running loop; read/write `value` here (DOM writes ok). */
  onFrame = (fn: () => void): (() => void) => {
    this.cfg_fns.add(fn);
    return () => {
      this.cfg_fns.delete(fn);
    };
  };

  private cfg_fns = new Set<() => void>();

  setTarget(t: number, immediate = false): void {
    this.target = t;
    if (immediate || prefersReducedMotion()) {
      this.value = t;
      this.velocity = 0;
      this.emit();
      this.stopLoop();
      return;
    }
    if (this.settled) this.startLoop();
  }

  setValue(v: number): void {
    this.value = v;
    this.target = v;
    this.emit();
  }

  private integrate(dt: number): void {
    const { stiffness: k, damping: c } = this.cfg;
    this.velocity += (k * (this.target - this.value) - c * this.velocity) * dt;
    this.value += this.velocity * dt;
    this.emit();
  }

  private emit(): void {
    for (const fn of this.cfg_fns) fn();
  }

  private startLoop(): void {
    this.settled = false;
    if (this.frame !== null) return;
    this.last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.032, Math.max(0.001, (now - this.last) / 1000));
      this.last = now;
      this.integrate(dt);
      if (Math.abs(this.velocity) < 0.02 && Math.abs(this.target - this.value) < 0.05) {
        this.value = this.target;
        this.velocity = 0;
        this.emit();
        this.frame = null;
        this.settled = true;
        this.cfg.onRest?.();
        return;
      }
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  private stopLoop(): void {
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
    this.settled = true;
  }
}

/** Stable Spring instance for a component's lifetime. */
export function useSpring(value: number, cfg: SpringConfig): Spring {
  const ref = useRef<Spring | null>(null);
  if (ref.current === null) ref.current = new Spring(value, cfg);
  return ref.current;
}

/** Re-rendering numeric spring — for count-ups and value displays. */
export function useSpringNumber(target: number, cfg?: Partial<SpringConfig>): number {
  const s = useSpring(target, { stiffness: cfg?.stiffness ?? 48, damping: cfg?.damping ?? 12 });
  const [v, setV] = useState(target);
  useEffect(() => s.onFrame(() => setV(s.value)), [s]);
  useEffect(() => {
    s.setTarget(target);
  }, [s, target]);
  return v;
}

/** Magnetic hover: element leans toward the pointer, springs home on leave.
    Writes transform directly — no re-renders at 60fps. */
export function useMagnetic<T extends HTMLElement>(
  strength = 0.22,
  cfg?: Partial<SpringConfig>,
): React.RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const sx = useRef<Spring | null>(null);
  const sy = useRef<Spring | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;
    const spx = new Spring(0, { stiffness: 190, damping: 17, ...cfg });
    const spy = new Spring(0, { stiffness: 190, damping: 17, ...cfg });
    sx.current = spx;
    sy.current = spy;
    const render = () => {
      el.style.transform = `translate3d(${spx.value}px, ${spy.value}px, 0)`;
    };
    const uf = spx.onFrame(render);

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const reach = Math.max(r.width, r.height) * 1.35;
      if (dist < reach) {
        const pull = 1 - dist / reach;
        spx.setTarget(dx * strength * pull * 1.6);
        spy.setTarget(dy * strength * pull * 1.6);
      } else {
        spx.setTarget(0);
        spy.setTarget(0);
      }
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      uf();
      el.style.transform = "";
    };
  }, [strength, cfg]);

  return ref;
}

/** Reveal-on-scroll: adds .in when the element enters the viewport (once). */
export function useReveal<T extends HTMLElement>(
  threshold = 0.18,
): React.RefObject<T | null> {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add("studio-reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // In view — or already scrolled past (came back up): reveal, not hide.
          if (entry.isIntersecting || entry.boundingClientRect.bottom < 0) {
            el.classList.add("studio-in");
            io.disconnect();
          }
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return ref;
}

export type Frame = number | null;
