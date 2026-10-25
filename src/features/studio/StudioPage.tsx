/* PULSE STUDIO — the cinematic route. Reference-fusion:
   1 · ember photography + glass session player,
   2 · dark stat deck,
   3 · luminous body with orbiting habit nodes.
   Everything runs on the real ledger through useHabits(). */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { useHabits } from "@/app/HabitsProvider";
import { currentStreak } from "@/lib/stats";
import { todayKey } from "@/lib/date";
import { useMagnetic, useSpring, useReveal } from "./physics";
import { Embers } from "./Embers";
import { HoloFigure } from "./HoloFigure";
import { BreathSession } from "./BreathSession";
import { Momentum } from "./Momentum";

const CSS = `
.studio-root { background:#060606; color:#F1EDE4; }
.studio-reveal { opacity:0; transform: translateY(26px); transition: opacity .9s cubic-bezier(.2,0,0,1), transform .9s cubic-bezier(.2,0,0,1); will-change: opacity, transform; }
.studio-reveal.studio-in { opacity:1; transform: none; }
.studio-grain { position:fixed; inset:-64%; z-index:70; pointer-events:none; opacity:.055; mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='240' height='240' filter='url(%23n)' opacity='0.6'/></svg>");
  animation: studioGrain 1.4s steps(8) infinite; }
@keyframes studioGrain { 0%,100%{transform:translate(0,0)} 12%{transform:translate(-2%,1.6%)} 25%{transform:translate(1.4%,-1.2%)} 37%{transform:translate(-1.2%,2%)} 50%{transform:translate(2%,0.8%)} 62%{transform:translate(-1.6%,-1.8%)} 75%{transform:translate(1.2%,1.4%)} 87%{transform:translate(-0.8%,-0.6%)} }
.holo-breath { animation: holoBreath 5.5s ease-in-out infinite; transform-box: view-box; transform-origin:210px 340px; }
@keyframes holoBreath { 0%,100%{ transform: scale(1);} 50%{ transform: scale(1.015) translateY(-3px);} }
.holo-draw { stroke-dasharray:1; stroke-dashoffset:1; animation: holoDraw 1.2s cubic-bezier(.2,0,0,1) forwards; }
@keyframes holoDraw { to { stroke-dashoffset:0; } }
.holo-pulse { animation: holoPulse 3s ease-in-out infinite; transform-box: fill-box; transform-origin:center; }
@keyframes holoPulse { 0%,100%{ transform:scale(1); opacity:.22;} 50%{ transform:scale(1.3); opacity:.5;} }
.holo-spin { animation: holoSpin 1.1s linear infinite; transform-box: fill-box; transform-origin:center; }
@keyframes holoSpin { to { transform: rotate(360deg); } }
.holo-node { cursor:pointer; outline:none; }
.holo-node:focus-visible circle:first-of-type { stroke:#EC6517; stroke-width:2px; }
.holo-node:hover circle:first-of-type { stroke:#EC8A5A; }
.studio-marquee { animation: studioMarquee 30s linear infinite; }
@keyframes studioMarquee { to { transform: translateX(-50%); } }
.studio-line-swap { animation: lineSwap .9s cubic-bezier(.2,0,0,1); }
@keyframes lineSwap { from{ opacity:0; transform: translateY(15px);} to{ opacity:1; transform:none;} }
.studio-cue { animation: cueScroll 2.3s cubic-bezier(.2,0,0,1) infinite; transform-origin:top; }
@keyframes cueScroll { 0%{transform:scaleY(0); transform-origin:top;} 46%{transform:scaleY(1); transform-origin:top;} 54%{transform:scaleY(1); transform-origin:bottom;} 100%{transform:scaleY(0); transform-origin:bottom;} }
.studio-loader-dot { animation: emberPulse 1.5s ease-in-out infinite; }
@keyframes emberPulse { 0%,100%{ opacity:.35; transform:scale(.8);} 50%{ opacity:1; transform:scale(1.35);} }
@media (prefers-reduced-motion: reduce) {
  .studio-grain, .holo-breath, .studio-cue, .studio-marquee { animation: none !important; }
  .studio-reveal { opacity:1 !important; transform:none !important; }
}
`;

/* magnetic CTA */
function Magnetic({
  href,
  onClick,
  className,
  children,
}: {
  href: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  className: string;
  children: React.ReactNode;
}) {
  const ref = useMagnetic<HTMLAnchorElement>(0.16);
  return (
    <a ref={ref} href={href} onClick={onClick} className={className}>
      {children}
    </a>
  );
}

function NavAnchor({ to, label }: { to: string; label: string }) {
  return (
    <a
      href={`#${to}`}
      onClick={(e) => {
        e.preventDefault();
        document.getElementById(to)?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        });
      }}
      className="mono-label text-[11px] text-[#F1EDE4]/55 transition-colors duration-200 hover:text-[#F1EDE4]"
    >
      {label}
    </a>
  );
}

export function StudioPage() {
  const { status, habits, logs, pending, toggle } = useHabits();
  const active = useMemo(() => habits.filter((h) => h.archivedAt === null), [habits]);
  const today = todayKey();
  const bestStreak = useMemo(
    () => active.reduce((n, h) => Math.max(n, currentStreak(logs[h.id] ?? [], today)), 0),
    [active, logs, today],
  );
  const todayDone = active.filter((h) => (logs[h.id] ?? []).includes(today)).length;
  const score = active.length === 0 ? 0 : Math.round((todayDone / active.length) * 100);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    // Cinematic entries start at the top; also stops scroll-restore hiding reveals.
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* hero pointer-parallax on the photo (DOM writes via springs) */
  const heroImgRef = useRef<HTMLImageElement | null>(null);
  const tiltX = useSpring(0, { stiffness: 42, damping: 15 });
  const tiltY = useSpring(0, { stiffness: 42, damping: 15 });
  useEffect(() => {
    const el = document.getElementById("studio-hero");
    if (!el) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tiltX.setTarget(((e.clientX - r.left) / r.width - 0.5) * 2);
      tiltY.setTarget(((e.clientY - r.top) / r.height - 0.5) * 2);
    };
    const leave = () => {
      tiltX.setTarget(0);
      tiltY.setTarget(0);
    };
    const render = () => {
      if (heroImgRef.current) heroImgRef.current.style.transform = `scale(1.08) translate(${(tiltX.value * -14).toFixed(1)}px, ${(tiltY.value * -10).toFixed(1)}px)`;
    };
    const u1 = tiltX.onFrame(render);
    const u2 = tiltY.onFrame(render);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerleave", leave);
      u1();
      u2();
    };
  }, [tiltX, tiltY]);

  const heroKicker = useReveal<HTMLParagraphElement>(0.4);
  const heroType = useReveal<HTMLDivElement>(0.25);

  const marqueeChips = useMemo(
    () =>
      active
        .filter((h) => currentStreak(logs[h.id] ?? [], today) > 0)
        .map((h) => ({ name: h.name, streak: currentStreak(logs[h.id] ?? [], today) })),
    [active, logs, today],
  );

  return (
    <div className="studio-root min-h-dvh" data-testid="studio-root">
      <style>{CSS}</style>
      <div className="studio-grain" aria-hidden />
      <div className="pointer-events-none fixed inset-0 z-60" aria-hidden>
        <div className="absolute inset-0 shadow-[inset_0_0_180px_60px_rgba(4,4,3,0.9)]" />
      </div>

      {/* nav */}
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled ? "border-b border-[#ffffff0f] bg-[#060606]/80 backdrop-blur-xl" : "border-b border-transparent"}`}>
        <div className="mx-auto flex h-16 w-full max-w-[1140px] items-center justify-between px-6">
          <Link to="/studio" className="flex items-baseline gap-1.5">
            <span className="font-serif text-[16px] tracking-[0.2em] text-[#F1EDE4]">PULSE</span>
            <span className="mb-0.5 inline-block size-1.5 rounded-full bg-[#EC6517] studio-loader-dot" aria-hidden />
          </Link>
          <nav aria-label="Studio" className="hidden items-center gap-7 md:flex">
            <NavAnchor to="studio-vision" label="VISION" />
            <NavAnchor to="studio-session" label="SESSION" />
            <NavAnchor to="studio-momentum" label="MOMENTUM" />
          </nav>
          <Link
            to="/"
            className="group inline-flex items-center gap-2 rounded-full border border-[#ffffff1f] bg-white/5 px-4 py-2 text-[12px] text-[#F1EDE4] backdrop-blur-md transition-colors duration-200 hover:bg-[#F1EDE4] hover:text-[#14130f]"
          >
            Open ledger
            <ArrowUpRight size={13} strokeWidth={1.8} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </header>

      {status === "loading" ? (
        <div className="flex min-h-dvh items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <span className="size-2 rounded-full bg-[#EC6517] studio-loader-dot" aria-hidden />
            <p className="mono-label text-[11px] text-[#8a857a]">CALIBRATING FIELD…</p>
          </div>
        </div>
      ) : (
        <>
          {/* 01 — hero */}
          <section id="studio-hero" className="relative flex h-[100svh] min-h-[640px] items-end overflow-hidden">
            <div className="absolute inset-0 overflow-hidden" aria-hidden>
              <img
                ref={heroImgRef}
                src="https://images.unsplash.com/photo-1619296740635-5d0a8afcc221?auto=format&fit=crop&w=2400&q=80"
                alt=""
                className="size-full object-cover object-[center_25%] will-change-transform"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#060606] via-[#060606]/10 to-[#120803]/35" aria-hidden />
            <div className="absolute inset-0 bg-[#1a0c04]/10 mix-blend-color" aria-hidden />
            <Embers className="absolute inset-0 size-full" rate={26} />

            <div className="relative z-10 mx-auto w-full max-w-[1140px] px-6 pb-24 will-change-transform sm:pb-28">
              <p ref={heroKicker} className="mono-label text-[11px] text-[#FFDFC4]/75">
                PULSE STUDIO — HABIT OBSERVATORY — 2026
              </p>
              <h1
                ref={heroType}
                className="studio-reveal mt-6 max-w-[720px] font-serif text-[64px] leading-[0.98] text-[#FFF6EA] sm:text-[92px]"
              >
                Rituals,
                <br />
                still breathing.
              </h1>
              <p className="mt-6 max-w-[340px] text-[15px] leading-relaxed text-[#FFEFDE]/85">
                A living observatory for your habits — every routine you keep rendered as light, motion and momentum.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Magnetic
                  href="#studio-vision"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById("studio-vision")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="inline-flex items-center gap-3 rounded-full bg-[#F6F3EA] px-6 py-3.5 text-[13px] font-medium text-[#191411] shadow-[0_14px_50px_rgba(255,178,122,0.35)] transition-colors duration-200 hover:bg-white"
                >
                  Enter the vision
                  <ArrowDown size={15} strokeWidth={2} />
                </Magnetic>
                <Magnetic href="/" className="inline-flex items-center gap-2 rounded-full border border-[#ffffff24] bg-white/8 px-6 py-3.5 text-[13px] text-[#FFF6EA] backdrop-blur-md transition-colors duration-200 hover:bg-white/16">
                  Open the ledger
                </Magnetic>
              </div>
            </div>

            {/* live metric strip */}
            <div className="absolute inset-x-0 bottom-0 z-10 border-t border-[#ffffff14]">
              <div className="mx-auto flex h-12 w-full max-w-[1140px] items-center justify-between px-6 font-mono text-[10px] tracking-[0.18em] text-[#FFDFC4]/70">
                <span>TODAY {score}%
                </span>
                <span className="hidden sm:inline">{active.length} ACTIVE RITUALS</span>
                <span className="hidden sm:inline">LONGEST {bestStreak}D</span>
                <span className="flex items-center gap-2" aria-hidden>
                  SCROLL
                  <span className="block h-6 w-[1px] bg-[#FFDFC4]/70 studio-cue" />
                </span>
              </div>
            </div>
          </section>

          {/* 02 — the vision */}
          <section id="studio-vision" className="relative scroll-mt-16 bg-[#060606] px-6 pb-36 pt-28">
            <div className="mx-auto w-full max-w-[1140px]">
              <p className="mono-label text-[11px] text-[#C9E96E]">02 — THE VISION</p>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
                <h2 className="max-w-[460px] font-serif text-[44px] leading-[1.04] text-[#F1EDE4] sm:text-[56px]">
                  The body keeps the score.
                </h2>
                <p className="max-w-[340px] text-[13px] leading-relaxed text-[#8a857a]">
                  Light is data here. Every node orbiting the figure is a ritual from your ledger — checked in today, it burns lime. Tap one to toggle it live.
                </p>
              </div>

              <div className="mt-16 grid items-center gap-12 lg:grid-cols-[280px_1fr_280px]">
                {/* left card */}
                <div className="rounded-[24px] border border-[#26251f] bg-[#111110] p-6">
                  <p className="mono-label text-[10px] text-[#8a857a]">PULSE INDEX</p>
                  <p className="mt-3 font-serif text-[44px] leading-none text-[#F1EDE4] tabular-nums">
                    {score}
                    <span className="text-[#C9E96E]">%</span>
                  </p>
                  <p className="mt-3 text-[12px] leading-relaxed text-[#6d675c]">
                    {todayDone} of {active.length} rituals checked in today. Completion isn't the goal — the streak after it is.
                  </p>
                  <div className="mt-5 space-y-2 border-t border-[#23221c] pt-4">
                    <p className="flex justify-between font-mono text-[10px] tracking-[0.12em] text-[#8a857a]">
                      <span>BEST STREAK</span>
                      <span className="text-[#C9E96E]">{bestStreak}D</span>
                    </p>
                    <p className="flex justify-between font-mono text-[10px] tracking-[0.12em] text-[#8a857a]">
                      <span>FEED</span>
                      <span className="text-[#8a857a]">LOCAL LEDGER</span>
                    </p>
                    <p className="flex justify-between font-mono text-[10px] tracking-[0.12em] text-[#8a857a]">
                      <span>LATENCY</span>
                      <span className="text-[#8a857a]">SIM · 220MS</span>
                    </p>
                  </div>
                </div>

                {/* figure */}
                <HoloFigure habits={habits} logs={logs} pending={pending} onToggle={toggle} />

                {/* right checklist */}
                <div className="flex flex-col gap-2.5">
                  <p className="mono-label mb-1 text-[10px] text-[#8a857a]">TONIGHT'S CHECKLIST</p>
                  {active.map((h) => {
                    const done = (logs[h.id] ?? []).includes(today);
                    const streak = currentStreak(logs[h.id] ?? [], today);
                    const busy = pending.includes(h.id);
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => toggle(h.id)}
                        disabled={busy || status === "error"}
                        aria-pressed={done}
                        className="group flex items-center justify-between rounded-2xl border border-[#26251f] bg-[#101010] px-4 py-3.5 text-left transition-colors duration-200 hover:border-[#2f2e26] disabled:opacity-50"
                      >
                        <span className="flex items-center gap-3">
                          <span className={`size-2 rounded-full ${done ? "bg-[#C9E96E] shadow-[0_0_10px_rgba(201,233,110,0.7)]" : "bg-[#3b382f]"}`} aria-hidden />
                          <span className={`text-[13px] ${done ? "text-[#F1EDE4]" : "text-[#8a857a]"}`}>{h.name}</span>
                        </span>
                        <span className={`font-mono text-[10px] tabular-nums ${done ? "text-[#C9E96E]" : "text-[#57534e]"}`}>
                          {busy ? "···" : streak > 0 ? `${streak}D` : "—"}
                        </span>
                      </button>
                    );
                  })}
                  {active.length === 0 ? <p className="text-[13px] text-[#6d675c]">No habits yet — the figure waits in darkness.</p> : null}
                </div>
              </div>
            </div>
          </section>

          {/* 03 — the session */}
          <section id="studio-session" className="relative scroll-mt-16">
            <BreathSession />
          </section>

          {/* divider — ember sky + streak marquee */}
          <div className="relative h-[240px] overflow-hidden border-y border-[#0f0e0b]">
            <img
              src="https://images.unsplash.com/photo-1649006775680-e642cabdf0df?auto=format&fit=crop&w=2400&q=80"
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-[#0a0a08]/35" />
            <div className="absolute inset-x-0 bottom-0 overflow-hidden">
              <div className="studio-marquee flex w-max items-center gap-10 whitespace-nowrap px-8 py-5">
                {[...marqueeChips, ...marqueeChips, ...marqueeChips].map((chip, i) => (
                  <span key={i} className="flex items-center gap-3 font-mono text-[11px] tracking-[0.16em] text-[#FFF3E8]/85">
                    <span aria-hidden className="size-1 rounded-full bg-[#EC6517]" />
                    {chip.name.toUpperCase()} — {chip.streak}D UNBROKEN
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 04 — momentum */}
          <Momentum habits={habits} logs={logs} />

          {/* finale */}
          <section className="relative flex h-[86svh] min-h-[560px] items-center justify-center overflow-hidden text-center">
            <img
              src="https://images.unsplash.com/photo-1517960413843-0aee8e2b3285?auto=format&fit=crop&w=2400&q=80"
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-[#160a03]/55" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a08] via-transparent to-[#060606]" />
            <Embers className="absolute inset-0 size-full" rate={12} interactive={false} />
            <div className="relative z-10 px-6">
              <h2 className="font-serif text-[52px] leading-[1.02] text-[#FFF6EA] sm:text-[72px]">Keep the streak alive.</h2>
              <p className="mx-auto mt-4 max-w-[380px] text-[14px] leading-relaxed text-[#FFEFDE]/85">
                The studio reads your ledger in real time — every check-in you land tonight restages tomorrow's light.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Magnetic href="/" className="inline-flex items-center gap-2 rounded-full bg-[#F6F3EA] px-7 py-3.5 text-[13px] font-medium text-[#191411] transition-colors duration-200 hover:bg-white">
                  Check in for today
                </Magnetic>
                <Magnetic href="/habits" className="inline-flex items-center gap-2 rounded-full border border-[#ffffff24] bg-white/8 px-7 py-3.5 text-[13px] text-[#FFF6EA] backdrop-blur-md transition-colors duration-200 hover:bg-white/16">
                  Manage rituals
                </Magnetic>
              </div>
            </div>
          </section>

          <footer className="border-t border-[#1c1b18] bg-[#060606] px-6 py-10">
            <div className="mx-auto flex w-full max-w-[1140px] flex-wrap items-center justify-between gap-4 font-mono text-[10px] tracking-[0.18em] text-[#57534e]">
              <span>PULSE STUDIO — REAL DATA · REAL PHYSICS · REAL LIGHT</span>
              <span className="flex items-center gap-2">
                © 2026 PULSE
                <span aria-hidden className="size-1 rounded-full bg-[#EC6517]" />
                A HABIT LEDGER
              </span>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
