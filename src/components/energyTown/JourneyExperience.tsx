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
const SECTIONS = 10; // total scroll length = SECTIONS * 100vh (longer = calmer pace)
const FLIGHT_END = 0.84; // camera flight occupies progress 0 .. FLIGHT_END
const PORTAL_MOUNT = 0.66; // mount the hologram portal early so it preloads
// No black transition anymore: the camera settles in front of the dome's
// hologram stage, and the real portal crossfades directly over it.
const PORTAL_FADE_START = 0.85;
const PORTAL_FADE_END = 0.92;

type Chapter = {
  start: number;
  end: number;
  kicker: string;
  title: string;
  sub?: string;
  body: string;
  note?: string;
  align: "left" | "right" | "center";
};

const CHAPTERS: Chapter[] = [
  {
    start: 0.0,
    end: 0.085,
    kicker: "SPIRIT CONNECT",
    title: "ENERGY POWERS AI. AI DESIGNS ENERGY.",
    body: "",
    align: "center",
  },
  {
    start: 0.11,
    end: 0.22,
    kicker: "01 / SOLAR FIELD",
    title: "HARVEST THE SUN",
    sub: "Solar energy begins the loop.",
    body: "Photovoltaic fields capture the first source of power for future habitats, data centres, and intelligent energy systems.",
    align: "left",
  },
  {
    start: 0.235,
    end: 0.278,
    kicker: "02 / NUCLEAR POWER CORE",
    title: "POWER BEYOND THE SUN",
    sub: "Some missions cannot depend on sunlight alone.",
    body: "Nuclear power cores provide long-duration, high-reliability energy for deep-space operation, shadowed regions, and always-on infrastructure.",
    align: "right",
  },
  {
    start: 0.29,
    end: 0.385,
    kicker: "03 / ENERGY STORAGE",
    title: "STORE THE LIGHT",
    sub: "Storage gives energy continuity.",
    body: "Battery systems absorb fluctuation, bridge darkness, and turn intermittent generation into dependable power for mission-critical operation.",
    align: "left",
  },
  {
    start: 0.405,
    end: 0.5,
    kicker: "04 / SOLID-STATE TRANSFORMER",
    title: "SHAPE THE GRID",
    sub: "Solid-state transformers form the backbone of advanced energy networks.",
    body: "Wide-bandgap devices, high-frequency magnetics, control, protection, thermal design, and power routing are integrated into one intelligent conversion hub.",
    align: "right",
  },
  {
    start: 0.515,
    end: 0.61,
    kicker: "05 / DATA CENTRE",
    title: "TRAIN THE INTELLIGENCE",
    sub: "Inside the data centre, energy becomes computation.",
    body: "Digital twins, converter simulations, device databases, magnetic models, thermal behaviour, and AI design agents learn from the power system — then help design the next one.",
    align: "left",
  },
  {
    start: 0.63,
    end: 0.7,
    kicker: "06 / CLOSE THE LOOP",
    title: "ENERGY POWERS AI. AI DESIGNS BETTER ENERGY.",
    sub: "The loop closes inside the habitat.",
    body: "Spirit Connect AIPE Labs connects power electronics, intelligent modelling, and future energy infrastructure into a self-improving engineering loop.",
    align: "center",
  },
];

function fadeWindow(p: number, start: number, end: number) {
  const span = end - start;
  const fade = Math.min(0.035, span * 0.3);
  if (p < start || p > end) return 0;
  // the hero chapter is fully visible at the top of the page and only
  // fades out as the camera descends toward the surface
  if (start > 0 && p < start + fade) return (p - start) / fade;
  if (p > end - fade) return (end - p) / fade;
  return 1;
}

export default function JourneyExperience() {
  const progressRef = useRef(0);
  const themeRef = useRef(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const chapterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hintRef = useRef<HTMLDivElement>(null);
  const portalWrapRef = useRef<HTMLDivElement>(null);
  const railDotRef = useRef<HTMLDivElement>(null);
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

    /* Normalize mouse-wheel scrolling across platforms (Windows mice,
       Firefox line-mode deltas, etc.) — drive the container directly. */
    const onWheel = (ev: WheelEvent) => {
      if (ev.ctrlKey) return; // keep pinch-zoom gestures intact
      ev.preventDefault();
      const factor =
        ev.deltaMode === 1 ? 33 : ev.deltaMode === 2 ? window.innerHeight : 1;
      scroller.scrollTop += ev.deltaY * factor;
    };
    window.addEventListener("wheel", onWheel, { passive: false });

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

      /* progress rail indicator */
      if (railDotRef.current) {
        railDotRef.current.style.top = `${(p * 100).toFixed(2)}%`;
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
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
    };
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

      {/* subtle vignette for a polished, cinematic feel */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(4, 8, 16, 0.32) 100%)",
        }}
      />

      {/* film grain */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 3,
          pointerEvents: "none",
          opacity: 0.05,
          mixBlendMode: "soft-light",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='280'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='280' height='280' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* intro fade from black */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 22,
          pointerEvents: "none",
          background: "#000",
          animation: "journeyIntroFade 1.6s ease 0.15s forwards",
        }}
      >
        <style>{`@keyframes journeyIntroFade { to { opacity: 0; } }`}</style>
      </div>

      {/* progress rail with chapter ticks */}
      <div
        style={{
          position: "fixed",
          right: 22,
          top: "50%",
          transform: "translateY(-50%)",
          height: "38vh",
          width: 2,
          zIndex: 4,
          background: "rgba(240, 246, 255, 0.16)",
          pointerEvents: "none",
        }}
      >
        {CHAPTERS.map((c) => (
          <div
            key={c.kicker}
            style={{
              position: "absolute",
              left: -2,
              top: `${((c.start + c.end) / 2) * 100}%`,
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "rgba(240, 246, 255, 0.35)",
            }}
          />
        ))}
        <div
          ref={railDotRef}
          style={{
            position: "absolute",
            left: -3,
            top: 0,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#2ebcfe",
            boxShadow: "0 0 10px rgba(46, 188, 254, 0.9)",
          }}
        />
      </div>

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
            // hero text sits high up, in the dark space above the horizon
            alignItems: i === 0 ? "flex-start" : "center",
            justifyContent:
              c.align === "center"
                ? "center"
                : c.align === "left"
                  ? "flex-start"
                  : "flex-end",
            padding: "0 clamp(20px, 7vw, 110px)",
            paddingTop: i === 0 ? "13vh" : 0,
            pointerEvents: "none",
            opacity: 0,
            visibility: "hidden",
          }}
        >
          <div
            style={{
              maxWidth: 520,
              textAlign: c.align === "center" ? "center" : "left",
              color: "rgba(240, 246, 255, 0.95)",
              textShadow: "0 2px 18px rgba(0, 8, 24, 0.6)",
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
            {c.sub && (
              <p
                style={{
                  fontFamily: "var(--font-barlow), sans-serif",
                  fontSize: "clamp(16px, 1.7vw, 21px)",
                  fontWeight: 400,
                  lineHeight: 1.4,
                  letterSpacing: "0.04em",
                  margin: "14px 0 0",
                  color: "rgba(46, 188, 254, 0.92)",
                }}
              >
                {c.sub}
              </p>
            )}
            {c.body && (
              <p
                style={{
                  fontFamily: "var(--font-barlow), sans-serif",
                  fontSize: "clamp(15px, 1.5vw, 18px)",
                  fontWeight: 300,
                  lineHeight: 1.55,
                  letterSpacing: "0.03em",
                  margin: "12px 0 0",
                  opacity: 0.92,
                }}
              >
                {c.body}
              </p>
            )}
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
          color: "rgba(240, 246, 255, 0.85)",
          fontFamily: "var(--font-ibm-mono), monospace",
          fontSize: 10,
          letterSpacing: "0.3em",
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
          background: "rgba(8, 14, 26, 0.55)",
          color: "rgba(240, 246, 255, 0.92)",
          border: `1px solid ${night ? "rgba(160, 190, 240, 0.4)" : "rgba(240, 246, 255, 0.3)"}`,
          backdropFilter: "blur(10px)",
          fontFamily: "var(--font-ibm-mono), monospace",
          fontSize: 10,
          letterSpacing: "0.22em",
          cursor: "pointer",
          transition: "all 0.6s ease",
        }}
        aria-label="Toggle day / night mode"
      >
        {night ? "◐ LUNAR NIGHT" : "◑ LUNAR DAY"}
      </button>

      {/* brand wordmark, consistent with the portal's overlay header */}
      <div
        style={{
          position: "fixed",
          top: 20,
          left: 22,
          zIndex: 6,
          pointerEvents: "none",
          fontFamily: "var(--font-ibm-mono), monospace",
          fontSize: 11,
          letterSpacing: "0.26em",
          color: "rgba(240, 246, 255, 0.88)",
          textShadow: "0 1px 10px rgba(0, 8, 24, 0.6)",
        }}
      >
        SPIRIT CONNECT
      </div>

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
        {portalMounted && (
          <PlaygroundCanvas initialPreset={night ? "dark" : "light"} />
        )}
      </div>
    </div>
  );
}
