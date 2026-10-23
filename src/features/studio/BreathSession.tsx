/* The Session — reference 1 rebuilt as a functional piece: a breathwork
   player. Glass pills (draggable Pace with inertia + rubber-band, Theme
   cycle), ±10s transport, and a breath ring that follows an inhale/hold/
   exhale cycle with spring-smoothed motion. */

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, RotateCw } from "lucide-react";
import { useSpring, prefersReducedMotion } from "./physics";

type Theme = "bright" | "ember" | "night";
const THEMES: Array<{ key: Theme; label: string; grade: string }> = [
  { key: "bright", label: "Bright", grade: "filter-none" },
  { key: "ember", label: "Ember", grade: "[filter:saturate(1.5)_hue-rotate(-14deg)_contrast(1.06)]" },
  { key: "night", label: "Night", grade: "[filter:brightness(.55)_saturate(.7)]" },
];

const LINES = [
  "Take a deep breath…",
  "Let the shoulders fall…",
  "Find the quiet rhythm…",
  "Nothing to chase — just count…",
];

const DURATIONS = [5, 10, 15]; // minutes
const BPM_MIN = 3;
const BPM_MAX = 10;

function mmss(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function BreathSession() {
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(6);
  const [theme, setTheme] = useState<Theme>("bright");
  const [elapsed, setElapsed] = useState(0);
  const [durationMin, setDurationMin] = useState(10);
  const [phase, setPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [count, setCount] = useState<number | null>(null);
  const [lineIdx, setLineIdx] = useState(0);
  const [complete, setComplete] = useState(false);

  const durationS = durationMin * 60;
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;
  const elapsedRef = useRef(elapsed);
  elapsedRef.current = elapsed;
  const finishAtRef = useRef<number | null>(null);

  const railRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const lineA = useSpring(0, { stiffness: 90, damping: 16 }); // ring size driver

  /* --- session clock (single rAF while playing) --- */
  useEffect(() => {
    if (!playing) {
      finishAtRef.current = null;
      lineA.setTarget(1);
      return;
    }
    finishAtRef.current = performance.now();
    let lastLineIdx = -1;
    let lastPhase = "";
    let lastSecond = -1;
    let lastCount: number | null = -1;
    let raf = 0;
    const tick = (now: number) => {
      const dt = (now - finishAtRef.current!) / 1000;
      finishAtRef.current = now;
      const next = elapsedRef.current + dt;

      if (next >= durationS) {
        setElapsed(durationS);
        setPlaying(false);
        setComplete(true);
        if (railRef.current) railRef.current.style.height = "100%";
        return;
      }
      elapsedRef.current = next;

      // rail + timestamps
      const frac = next / durationS;
      if (railRef.current) railRef.current.style.height = `${(frac * 100).toFixed(2)}%`;
      const sec = Math.floor(next);
      if (sec !== lastSecond) {
        lastSecond = sec;
        setElapsed(next);
      }

      // countdown numerals for the first five seconds
      const c = sec < 5 ? 5 - sec : null;
      if (c !== lastCount) {
        lastCount = c;
        setCount(c);
      }

      // breath cycle
      const cycle = 60 / bpmRef.current;
      const t = next % cycle;
      const inFrac = 0.42;
      const holdFrac = 0.16;
      let p: "inhale" | "hold" | "exhale";
      let size: number;
      if (t < cycle * inFrac) {
        p = "inhale";
        const f = t / (cycle * inFrac);
        size = 1 + 0.24 * (0.5 - Math.cos(Math.PI * f) / 2);
      } else if (t < cycle * (inFrac + holdFrac)) {
        p = "hold";
        size = 1.24;
      } else {
        p = "exhale";
        const f = (t - cycle * (inFrac + holdFrac)) / (cycle * (1 - inFrac - holdFrac));
        size = 1.24 - 0.24 * (0.5 - Math.cos(Math.PI * f) / 2);
      }
      if (p !== lastPhase) {
        lastPhase = p;
        setPhase(p);
      }

      if (prefersReducedMotion()) {
        if (ringRef.current) ringRef.current.style.transform = "scale(1)";
        if (glowRef.current) glowRef.current.style.opacity = "0.35";
      } else {
        lineA.setTarget(size);
        if (ringRef.current) ringRef.current.style.transform = `scale(${lineA.value.toFixed(3)})`;
        if (glowRef.current) glowRef.current.style.opacity = `${(((lineA.value - 1) / 0.24) * 0.45).toFixed(3)}`;
      }

      // rotating line roughly every 7.5 s
      const li = Math.floor(next / 7.5) % LINES.length;
      if (li !== lastLineIdx) {
        lastLineIdx = li;
        setLineIdx(li);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, durationS, lineA]);

  const skip = (deltaS: number) => {
    const next = Math.min(durationS - 1, Math.max(0, elapsedRef.current + deltaS));
    elapsedRef.current = next;
    setElapsed(next);
    if (railRef.current) railRef.current.style.height = `${(next / durationS) * 100}%`;
    if (complete && next < durationS) setComplete(false);
  };

  /* --- Pace pill: drag with inertia + rubber band --- */
  const trackRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);
  const pos = useSpring(((bpm - BPM_MIN) / (BPM_MAX - BPM_MIN)) * 100, {
    stiffness: 170,
    damping: 14,
  });
  useEffect(
    () =>
      pos.onFrame(() => {
        if (handleRef.current) {
          handleRef.current.style.left = `${pos.value}%`;
        }
      }),
    [pos],
  );
  useEffect(() => {
    pos.setTarget(((bpm - BPM_MIN) / (BPM_MAX - BPM_MIN)) * 100);
  }, [bpm, pos]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let dragging = false;
    let rawPos = pos.target;
    const fracFromEvent = (e: PointerEvent): number => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      // rubber band: resist, then clamp
      if (x < 0) return Math.max(-0.14, x / 3);
      if (x > 1) return Math.min(1.14, 1 + (x - 1) / 3);
      return x;
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      rawPos = fracFromEvent(e) * 100;
      pos.setTarget(Math.min(100, Math.max(0, rawPos)));
    };
    const up = () => {
      if (!dragging) return;
      dragging = false;
      const bpmNext = Math.round(Math.max(0, Math.min(1, rawPos / 100)) * (BPM_MAX - BPM_MIN)) + BPM_MIN;
      setBpm(bpmNext);
      pos.setTarget(((bpmNext - BPM_MIN) / (BPM_MAX - BPM_MIN)) * 100);
    };
    const down = (e: PointerEvent) => {
      dragging = true;
      move(e);
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [pos]);

  const activeTheme = THEMES.find((t) => t.key === theme);

  const cycleLabel = complete ? "Well kept." : LINES[lineIdx];

  return (
    <div className="relative isolate flex min-h-[100svh] items-center overflow-hidden">
      {/* backdrop photo + grade */}
      <div className="absolute inset-0 -z-10">
        <img
          src="https://images.unsplash.com/photo-1551783037-abc1c6093c85?auto=format&fit=crop&w=2400&q=80"
          alt=""
          className={`size-full object-cover transition-[filter] duration-700 ${activeTheme?.grade}`}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#140b05]/85 via-[#140b05]/35 to-[#140b05]/10" />
        <div className="absolute inset-0 bg-[#0a0a08]/10" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[560px] px-6 py-24">
        {/* chip */}
        <span className="inline-flex items-center gap-2 rounded-full border border-[#EC6517]/30 bg-[#e9631b]/15 px-4 py-2 text-[13px] text-[#FFEFDE] backdrop-blur-md">
          Breathwork
        </span>

        <h2 className="mt-5 min-h-[2.4em] font-serif text-[44px] leading-[1.08] text-[#FFF6EA] sm:text-[56px]" aria-live="polite">
          <span key={cycleLabel} className="studio-line-swap inline-block">
            {cycleLabel}
          </span>
        </h2>

        <div className="mt-1 h-6 font-mono text-[13px] tracking-[0.3em] text-[#FFDFC4]/70" aria-hidden data-testid="breath-count">
          {playing ? (count !== null ? `${count}...` : phaseLabel(phase)) : ""}
        </div>

        {/* pills */}
        <div className="mt-10 flex flex-col gap-4">
          <div className="relative flex h-[64px] items-center rounded-full border border-white/12 bg-white/8 pl-7 pr-6 text-[15px] text-[#FFF6EA] shadow-[0_18px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <span className="shrink-0 font-medium">Pace</span>
            <div
              ref={trackRef}
              role="slider"
              tabIndex={0}
              aria-label="Breaths per minute"
              aria-valuemin={BPM_MIN}
              aria-valuemax={BPM_MAX}
              aria-valuenow={bpm}
              className="relative ml-6 flex h-full flex-1 cursor-grab items-center active:cursor-grabbing"
              data-testid="pace-track"
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                  e.preventDefault();
                  setBpm((b) => Math.min(BPM_MAX, b + 1));
                } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                  e.preventDefault();
                  setBpm((b) => Math.max(BPM_MIN, b - 1));
                }
              }}
            >
              <div className="pointer-events-none flex flex-1 items-center justify-between px-6">
                {Array.from({ length: 7 }, (_, i) => {
                  const dotBpm = BPM_MIN + ((i + 0.5) / 7) * (BPM_MAX - BPM_MIN);
                  const near = Math.abs(dotBpm - bpm) < 0.9;
                  return (
                    <span
                      key={i}
                      className="size-1 rounded-full bg-[#FFF6EA] transition-opacity duration-200"
                      style={{ opacity: near ? 0.85 : 0.28 }}
                    />
                  );
                })}
              </div>
              <div
                ref={handleRef}
                className="absolute top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full bg-[#FFF6EA] shadow-[0_0_12px_rgba(255,246,234,0.6)]"
                style={{ left: `${((bpm - BPM_MIN) / (BPM_MAX - BPM_MIN)) * 100}%` }}
              />
            </div>
            <span className="ml-5 min-w-8 shrink-0 text-right font-mono text-[14px] tabular-nums">{bpm}</span>
          </div>

          <button
            type="button"
            onClick={() => setTheme(THEMES[(THEMES.findIndex((t) => t.key === theme) + 1) % THEMES.length].key)}
            className="relative flex h-[64px] items-center rounded-full border border-white/12 bg-white/8 pl-7 pr-6 text-left text-[15px] text-[#FFF6EA] shadow-[0_18px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl transition-colors duration-200 hover:bg-white/14"
          >
            <span aria-hidden className="mr-4 h-4 w-[2px] rounded-full bg-[#FFF6EA]/70" />
            <span className="font-medium">Theme</span>
            <span className="pointer-events-none ml-auto flex items-center gap-3">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className="size-1 rounded-full bg-[#FFF6EA]" style={{ opacity: 0.22 }} />
              ))}
              <span className="min-w-14 text-right text-[14px]">{activeTheme?.label}</span>
            </span>
          </button>
        </div>

        {/* transport */}
        <div className="mt-12 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => skip(-10)}
            aria-label="Back ten seconds"
            className="relative flex size-[64px] items-center justify-center rounded-full border border-white/15 bg-white/9 text-[#FFF6EA] backdrop-blur-xl transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            <RotateCcw size={21} strokeWidth={1.6} />
            <span className="absolute bottom-[13px] left-1/2 -translate-x-1/2 text-[8px] font-medium tracking-widest">10</span>
          </button>

          <div className="relative">
            <div
              ref={ringRef}
              aria-hidden
              className="absolute left-1/2 top-1/2 size-[96px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#FFF6EA]/35"
              style={{ willChange: "transform" }}
            />
            <div
              ref={glowRef}
              aria-hidden
              className="absolute left-1/2 top-1/2 size-[96px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FFB27A]/40 blur-2xl"
            />
            <button
              type="button"
              onClick={() => {
                if (complete) {
                  setElapsed(0);
                  setComplete(false);
                  setPlaying(true);
                } else {
                  setPlaying((p) => !p);
                }
              }}
              aria-label={playing && !complete ? "Pause session" : "Play session"}
              data-testid="session-transport"
              className="relative flex size-[76px] items-center justify-center rounded-full bg-[#FFF6EA] text-[#191411] shadow-[0_10px_40px_rgba(255,214,170,0.45)] transition-transform duration-200 hover:scale-[1.06] active:scale-95"
            >
              {playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-0.5" />}
            </button>
          </div>

          <button
            type="button"
            onClick={() => skip(10)}
            aria-label="Forward ten seconds"
            className="relative flex size-[64px] items-center justify-center rounded-full border border-white/15 bg-white/9 text-[#FFF6EA] backdrop-blur-xl transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            <RotateCw size={21} strokeWidth={1.6} />
            <span className="absolute bottom-[13px] left-1/2 -translate-x-1/2 text-[8px] font-medium tracking-widest">10</span>
          </button>
        </div>
      </div>

      {/* right rail: timeline like reference 1 */}
      <div className="absolute right-5 top-0 hidden h-full select-none sm:flex sm:right-10" aria-hidden>
        <div className="flex h-full flex-col items-stretch py-[16svh] text-right">
          <span className="font-mono text-[11px] leading-none text-[#FFF6EA]/80 tabular-nums">{mmss(elapsed)}</span>
          <div className="relative mx-auto my-3 h-auto w-[1px] flex-1 rounded-full bg-white/25">
            <div ref={railRef} className="absolute inset-x-0 top-0 w-full rounded-full bg-[#FFF6EA]" style={{ height: "0%" }} />
          </div>
          <button
            type="button"
            onClick={() => {
              const i = DURATIONS.indexOf(durationMin);
              setDurationMin(DURATIONS[(i + 1) % DURATIONS.length]);
            }}
            title="Change session length"
            className="font-mono text-[11px] leading-none text-[#FFF6EA]/80 tabular-nums"
          >
            {mmss(durationS)}
          </button>
        </div>
      </div>
    </div>
  );
}

function phaseLabel(p: "inhale" | "hold" | "exhale"): string {
  return p === "inhale" ? "breathe in" : p === "hold" ? "hold" : "breathe out";
}
