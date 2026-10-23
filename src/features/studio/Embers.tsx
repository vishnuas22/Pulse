/* Canvas ember field. Particles carry a physical state (position, velocity,
   buoyant acceleration, curl-like swirl) and interact with the pointer via an
   inverse-square repulsion. Rendered additively with a pre-baked glow sprite.
   Honors prefers-reduced-motion by drawing one static, faint frame. */

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./physics";

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // seconds alive
  ttl: number;
  size: number;
  seed: number;
}

interface Props {
  /** particles per second (approx). */
  rate?: number;
  className?: string;
  /** pointer interaction off if false. */
  interactive?: boolean;
}

const GRAVITY = -26; // px/s², buoyant (embers rise)
const DRAG = 0.9; // 1/s
const REPEL_RADIUS = 130;
const REPEL_FORCE = 26000;

function makeSprite(size: number, _hue: [number, number], _lightness: [number, number]): HTMLCanvasElement {
  const c = document.createElement("canvas");
  const w = Math.ceil(size * 2);
  c.width = w;
  c.height = w;
  const g = c.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    const h = 18 + Math.random() * 22;
    const l = 74 + Math.random() * 14;
    grad.addColorStop(0, `hsla(${h}, 96%, ${l + 14}%, 0.95)`);
    grad.addColorStop(0.28, `hsla(${h}, 94%, ${l}%, 0.5)`);
    grad.addColorStop(0.6, `hsla(${h - 4}, 88%, ${l * 0.72}%, 0.16)`);
    grad.addColorStop(1, "hsla(20, 90%, 30%, 0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, w);
  }
  return c;
}

export function Embers({ rate = 22, className, interactive = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    let w = 0;
    let h = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const sprites = Array.from({ length: 6 }, (_, i) =>
      makeSprite(14 + i * 9, [16, 42], [72, 88]),
    );

    const embers: Ember[] = [];
    const spawn = (initial = false): void => {
      embers.push({
        x: Math.random() * w,
        y: initial ? Math.random() * h : h + 12 + Math.random() * 40,
        vx: (Math.random() - 0.5) * 14,
        vy: -6 - Math.random() * 16,
        life: 0,
        ttl: 7 + Math.random() * 7,
        size: 3.5 + Math.random() * 11,
        seed: Math.random() * 1000,
      });
    };
    for (let i = 0; i < Math.min(28, rate); i += 1) spawn(true);

    const pointer = { x: -9999, y: -9999, active: false };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.active = interactive;
    };
    const onLeave = () => {
      pointer.active = false;
    };

    if (reduced) {
      // Static field: one gentle frame.
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 14; i += 1) {
        const s = sprites[i % sprites.length];
        ctx.globalAlpha = 0.16;
        ctx.drawImage(s, Math.random() * w, Math.random() * h, s.width, s.height);
      }
      return;
    }

    let raf: number | null = null;
    let last = performance.now();
    let carry = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      carry += dt * rate;
      while (carry >= 1) {
        spawn();
        carry -= 1;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      for (let i = embers.length - 1; i >= 0; i -= 1) {
        const p = embers[i];
        p.life += dt;
        if (p.life > p.ttl || p.y < -30) {
          embers.splice(i, 1);
          continue;
        }

        // Curl-ish swirl field: pseudo-noise from sin/cos of position + time.
        const t = now / 1000 + p.seed;
        const swirlX = Math.sin(p.y * 0.006 + t * 0.7) * 9 + Math.cos(t * 0.41 + p.seed) * 5;
        const swirlY = Math.cos(p.x * 0.005 - t * 0.5) * 6;

        let ax = swirlX - p.vx * DRAG;
        let ay = GRAVITY + swirlY - p.vy * DRAG;

        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < REPEL_RADIUS * REPEL_RADIUS && d2 > 1) {
            const f = REPEL_FORCE / (d2 + 600);
            const d = Math.sqrt(d2);
            ax += (dx / d) * f;
            ay += (dy / d) * f;
          }
        }

        p.vx += ax * dt;
        p.vy += ay * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        const fade = p.life / p.ttl;
        const alpha = 0.55 * Math.sin(Math.min(1, fade) * Math.PI) * (1 - fade * 0.25);
        if (alpha <= 0.001) continue;

        const s = sprites[Math.min(sprites.length - 1, Math.floor(p.size / 3))];
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.drawImage(s, p.x - s.width / 2, p.y - s.height / 2, s.width, s.height);
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [rate, interactive]);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
