"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import TownCanvas from "@/components/energyTown/TownCanvas";

const PlaygroundCanvas = dynamic(
  () => import("@/components/hologramParticles/PlaygroundCanvas"),
  { ssr: false }
);

/* ------------------------------------------------------------------ */
/* Scroll layout                                                       */
/* ------------------------------------------------------------------ */
const SECTIONS = 8; // total scroll length = SECTIONS * 100vh
const FLIGHT_END = 0.84; // camera flight occupies progress 0 .. FLIGHT_END
const PORTAL_MOUNT = 0.7; // mount the hologram portal early so it preloads
const PORTAL_FADE_START = 0.86;
const PORTAL_FADE_END = 0.97;

type Chapter = {
  start: number;
  end: number;
  kicker: string;
  title: string;
  body: string;
  align: "left" | "right" | "center";
};

const CHAPTERS: Chapter[] = [
  {
    start: 0.0,
    end: 0.09,
    kicker: "SPIRIT CONNECT",
    title: "ENERGY FOR A TYPE I CIVILISATION",
    body: "Energy helps humanity enter a Type I civilisation. Scroll to follow the flow.",
    align: "center",
  },
  {
    start: 0.14,
    end: 0.27,
    kicker: "01 / HARVEST THE WIND",
    title: "WHERE POWER BEGINS",
    body: "Clean power starts where the wind never sleeps. AI-driven power electronics turn motion into megawatts — the mission of Spirit Connect AIPE Labs.",
    align: "left",
  },
  {
    start: 0.34,
    end: 0.47,
    kicker: "02 / CAPTURE THE SUN",
    title: "EVERY ROOFTOP, A POWER PLANT",
    body: "Intelligent converters squeeze every photon. From utility farms to rooftops, energy is harvested wherever light falls.",
    align: "right",
  },
  {
    start: 0.54,
    end: 0.66,
    kicker: "03 / POWER EVERY HOME",
    title: "A LIVING NETWORK",
    body: "Energy flows through the community like a nervous system — AI for everyday life, connecting tools, homes, and ideas.",
    align: "left",
  },
  {
    start: 0.72,
    end: 0.82,
    kicker: "04 / ASCEND",
    title: "FROM ENERGY TO INTELLIGENCE",
    body: "Rise above the grid. The Spirit Connect portal awaits.",
    align: "center",
  },
];

function fadeWindow(p: number, start: number, end: number) {
  const span = end - start;
  const fade = Math.min(0.035, span * 0.3);
  if (p < start || p > end) return 0;
  if (p < start + fade) return (p - start) / fade;
  if (p > end - fade) return (end - p) / fade;
  return 1;
}

export default function JourneyPage() {
  const progressRef = useRef(0);
  const themeRef = useRef(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const chapterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hintRef = useRef<HTMLDivElement>(null);
  const portalWrapRef = useRef<HTMLDivElement>(null);
  const [night, setNight] = useState(false);
  const [portalMounted, setPortalMounted] = useState(false);
  const portalMountedRef = useRef(false);

  const toggleTheme = useCallback(() => {
    setNight((n) => {
      themeRef.current = n ? 0 : 1;
      return !n;
    });
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let raf = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const max = scroller.scrollHeight - scroller.clientHeight;
      const p = max > 0 ? scroller.scrollTop / max : 0;
      progressRef.current = p;

      /* chapter overlay opacity, driven directly on the DOM */
      CHAPTERS.forEach((c, i) => {
        const el = chapterRefs.current[i];
        if (!el) return;
        const o = fadeWindow(p, c.start, c.end);
        el.style.opacity = o.toFixed(3);
        el.style.transform = `translateY(${(1 - o) * 14}px)`;
        el.style.visibility = o <= 0.001 ? "hidden" : "visible";
      });

      /* scroll hint */
      if (hintRef.current) {
        const o = Math.max(0, 1 - p / 0.04);
        hintRef.current.style.opacity = o.toFixed(3);
      }

      /* portal mount + crossfade */
      if (p > PORTAL_MOUNT && !portalMountedRef.current) {
        portalMountedRef.current = true;
        setPortalMounted(true);
      }
      const wrap = portalWrapRef.current;
      if (wrap) {
        const o = Math.min(
          1,
          Math.max(0, (p - PORTAL_FADE_START) / (PORTAL_FADE_END - PORTAL_FADE_START))
        );
        wrap.style.opacity = o.toFixed(3);
        wrap.style.pointerEvents = o > 0.92 ? "auto" : "none";
        wrap.style.visibility = o <= 0.001 ? "hidden" : "visible";
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={scrollerRef}
      style={{
        position: "fixed",
        inset: 0,
        overflowY: "auto",
        overflowX: "hidden",
        overscrollBehavior: "none",
      }}
    >
      {/* scroll length */}
      <div style={{ height: `${SECTIONS * 100}vh`, pointerEvents: "none" }} />

      {/* 3D town */}
      <TownCanvas
        progressRef={progressRef}
        themeRef={themeRef}
        flightEnd={FLIGHT_END}
      />

      {/* chapter overlays */}
      {CHAPTERS.map((c, i) => (
        <div
          key={c.kicker}
          ref={(el) => {
            chapterRefs.current[i] = el;
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent:
              c.align === "center"
                ? "center"
                : c.align === "left"
                  ? "flex-start"
                  : "flex-end",
            padding: "0 clamp(20px, 7vw, 110px)",
            pointerEvents: "none",
            opacity: 0,
            visibility: "hidden",
          }}
        >
          <div
            style={{
              maxWidth: 520,
              textAlign: c.align === "center" ? "center" : "left",
              color: night ? "rgba(240, 246, 255, 0.95)" : "rgba(16, 26, 20, 0.92)",
              textShadow: night
                ? "0 2px 18px rgba(0, 8, 24, 0.55)"
                : "0 2px 16px rgba(235, 248, 255, 0.6)",
              transition: "color 0.9s ease, text-shadow 0.9s ease",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-ibm-mono), monospace",
                fontSize: 11,
                letterSpacing: "0.22em",
                marginBottom: 12,
                opacity: 0.85,
              }}
            >
              {c.kicker}
            </div>
            <h2
              style={{
                fontFamily: "var(--font-bebas), sans-serif",
                fontSize: "clamp(34px, 5.6vw, 64px)",
                lineHeight: 0.98,
                letterSpacing: "0.03em",
                margin: 0,
              }}
            >
              {c.title}
            </h2>
            <p
              style={{
                fontFamily: "var(--font-barlow), sans-serif",
                fontSize: "clamp(15px, 1.5vw, 18px)",
                fontWeight: 300,
                lineHeight: 1.55,
                letterSpacing: "0.03em",
                margin: "16px 0 0",
                opacity: 0.92,
              }}
            >
              {c.body}
            </p>
          </div>
        </div>
      ))}

      {/* scroll hint */}
      <div
        ref={hintRef}
        style={{
          position: "fixed",
          bottom: 26,
          left: 0,
          right: 0,
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          pointerEvents: "none",
          color: night ? "rgba(240, 246, 255, 0.85)" : "rgba(16, 26, 20, 0.7)",
          fontFamily: "var(--font-ibm-mono), monospace",
          fontSize: 10,
          letterSpacing: "0.3em",
          transition: "color 0.9s ease",
        }}
      >
        <span>SCROLL</span>
        <span style={{ animation: "journeyBounce 1.6s ease-in-out infinite" }}>↓</span>
        <style>{`@keyframes journeyBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(6px); } }`}</style>
      </div>

      {/* day / night toggle */}
      <button
        onClick={toggleTheme}
        style={{
          position: "fixed",
          top: 18,
          right: 18,
          zIndex: 6,
          padding: "9px 16px",
          background: night ? "rgba(8, 14, 26, 0.55)" : "rgba(250, 253, 255, 0.55)",
          color: night ? "rgba(240, 246, 255, 0.92)" : "rgba(16, 26, 20, 0.85)",
          border: `1px solid ${night ? "rgba(160, 190, 240, 0.4)" : "rgba(16, 26, 20, 0.25)"}`,
          backdropFilter: "blur(10px)",
          fontFamily: "var(--font-ibm-mono), monospace",
          fontSize: 10,
          letterSpacing: "0.22em",
          cursor: "pointer",
          transition: "all 0.6s ease",
        }}
        aria-label="Toggle day / night mode"
      >
        {night ? "◐ NIGHT" : "◑ DAY"}
      </button>

      {/* final destination: the existing hologram portal */}
      <div
        ref={portalWrapRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10,
          opacity: 0,
          visibility: "hidden",
          pointerEvents: "none",
          background: "#0e0d0c",
        }}
      >
        {portalMounted && <PlaygroundCanvas />}
      </div>
    </div>
  );
}
