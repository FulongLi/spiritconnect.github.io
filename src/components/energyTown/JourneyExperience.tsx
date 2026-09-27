"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import TownCanvas from "@/components/energyTown/TownCanvas";
import SiteHeader from "@/components/site/SiteHeader";
import Footer from "@/components/overlay/components/Footer/Footer";
import {
  CHAPTERS,
  SCROLL_SECTIONS,
  TIMELINE,
  loopIntensity,
  scrollToStory,
  storyToScroll,
} from "@/content/journey";
import { COMPANY } from "@/content/site";
import {
  nextExperienceState,
  planRendering,
  samePlan,
  type RenderPlan,
} from "@/lib/render/experienceState";
import { useReducedMotion } from "@/lib/hooks/useMediaQuery";
import { useDebugFlags } from "@/lib/hooks/useDebugFlags";
import styles from "./JourneyExperience.module.css";

// the interior (and its WebGPU stack) is only downloaded when approached
const loadInterior = () => import("@/components/presence/PresenceInterior");
const PresenceInterior = dynamic(loadInterior, { ssr: false });

/** fetch the interior code ahead of time (from the data-centre chapter on) */
const PREFETCH_INTERIOR_AT = 0.5;
let interiorPrefetched = false;
function prefetchInterior() {
  if (interiorPrefetched) return;
  interiorPrefetched = true;
  loadInterior().catch(() => {
    interiorPrefetched = false;
  });
}

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

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

const INITIAL_PLAN = planRendering("LUNAR", 0);

/** scroll → camera damping (per second); the same feel the flight always had */
const PROGRESS_DAMPING = 1.65;

export default function JourneyExperience() {
  /** smoothed story progress: drives the lunar camera, the hand-off and the interior camera */
  const progressRef = useRef(0);
  /** interior camera: 0 in the airlock → 1 at the workstation */
  const arrivalRef = useRef(0);
  const themeRef = useRef(0);
  const loopRef = useRef(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const chapterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hintRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const portalWrapRef = useRef<HTMLDivElement>(null);
  const railDotRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const planRef = useRef<RenderPlan>(INITIAL_PLAN);

  const [night, setNight] = useState(false);
  const [plan, setPlan] = useState<RenderPlan>(INITIAL_PLAN);
  const [entranceKey, setEntranceKey] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const reducedMotion = useReducedMotion();
  const debug = useDebugFlags();

  const toggleTheme = useCallback(() => {
    setNight((n) => {
      themeRef.current = n ? 0 : 1;
      return !n;
    });
  }, []);

  const scrollToProgress = useCallback(
    (p: number) => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const max = scroller.scrollHeight - scroller.clientHeight;
      scroller.scrollTo({
        top: storyToScroll(p) * max,
        behavior: reducedMotion ? "auto" : "smooth",
      });
    },
    [reducedMotion],
  );

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let raf = 0;
    let smoothRaf = 0;
    let lastTick = 0;
    let target = 0;
    let smoothed = -1;
    let revealedNow = false;

    /* everything that follows the camera: the arrival, hand-off and render plan */
    const applySmoothed = (p: number, prev: number) => {
      progressRef.current = p;
      arrivalRef.current = clamp01(
        (p - TIMELINE.interiorStart) / (TIMELINE.interiorEnd - TIMELINE.interiorStart),
      );

      /* WELCOME caption as the airlock approaches */
      if (captionRef.current) {
        const inO = clamp01((p - TIMELINE.captionIn) / 0.016);
        const outO = clamp01((TIMELINE.captionOut - p) / 0.016);
        captionRef.current.style.opacity = (inO * outO).toFixed(3);
      }

      /* hand-off inside the vestibule: the workspace fades in over the lunar scene */
      const wrap = portalWrapRef.current;
      if (wrap) {
        const t = clamp01(
          (p - TIMELINE.portalFadeStart) / (TIMELINE.portalFadeEnd - TIMELINE.portalFadeStart),
        );
        const o = t * t * (3 - 2 * t);
        wrap.style.opacity = o.toFixed(3);
        wrap.style.pointerEvents = o > 0.92 ? "auto" : "none";
        wrap.style.visibility = o <= 0.001 ? "hidden" : "visible";
      }

      /* rendering lifecycle: LUNAR → TRANSITION → PRESENCE */
      const nextState = nextExperienceState(planRef.current.state, p);
      const nextPlan = planRendering(nextState, p);
      if (!samePlan(nextPlan, planRef.current)) {
        planRef.current = nextPlan;
        setPlan(nextPlan);
      }

      /* particles assemble and the screens wake each time the Dome is entered */
      if (p >= TIMELINE.portalFadeStart && prev < TIMELINE.portalFadeStart) {
        setEntranceKey((k) => k + 1);
      }
      const nextRevealed = p >= TIMELINE.interiorReveal;
      if (nextRevealed !== revealedNow) {
        revealedNow = nextRevealed;
        setRevealed(nextRevealed);
      }
    };

    /* scroll → smoothed progress, one damped step per frame until it settles */
    const tick = (now: number) => {
      const dt = Math.min((now - lastTick) / 1000, 0.05);
      lastTick = now;
      const prev = smoothed;
      smoothed += (target - smoothed) * Math.min(1, dt * PROGRESS_DAMPING);
      if (Math.abs(target - smoothed) < 1e-5) smoothed = target;
      applySmoothed(smoothed, prev);
      smoothRaf = smoothed === target ? 0 : requestAnimationFrame(tick);
    };

    /* all scroll-linked DOM updates, run at most once per frame */
    const update = () => {
      raf = 0;
      const max = scroller.scrollHeight - scroller.clientHeight;
      const r = max > 0 ? scroller.scrollTop / max : 0;
      const p = scrollToStory(r);
      target = p;
      if (smoothed < 0) {
        // first read (possibly a restored scroll position): no glide on load
        smoothed = p;
        applySmoothed(p, -1);
      } else if (!smoothRaf) {
        lastTick = performance.now();
        smoothRaf = requestAnimationFrame(tick);
      }
      loopRef.current = loopIntensity(p);
      if (p >= PREFETCH_INTERIOR_AT) prefetchInterior();

      /* chapter overlay opacity, driven directly on the DOM */
      CHAPTERS.forEach((c, i) => {
        const el = chapterRefs.current[i];
        if (!el) return;
        const o = fadeWindow(p, c.start, c.end);
        el.style.opacity = o.toFixed(3);
        el.style.transform = `translateY(${(1 - o) * 14}px)`;
        el.style.visibility = o <= 0.001 ? "hidden" : "visible";
      });

      /* scroll hint + skip control */
      if (hintRef.current) {
        hintRef.current.style.opacity = Math.max(0, 1 - p / 0.04).toFixed(3);
      }
      if (skipRef.current) {
        const o = clamp01((TIMELINE.arrivalStart - p) / 0.04);
        skipRef.current.style.opacity = o.toFixed(3);
        skipRef.current.style.visibility = o <= 0.001 ? "hidden" : "visible";
      }

      /* progress rail indicator */
      if (railDotRef.current) {
        railDotRef.current.style.top = `${(p * 100).toFixed(2)}%`;
      }
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    /* Normalize mouse-wheel scrolling across platforms (Windows mice,
       Firefox line-mode deltas, etc.) — drive the container directly. */
    const onWheel = (ev: WheelEvent) => {
      if (ev.ctrlKey) return; // keep pinch-zoom gestures intact
      const target = ev.target as HTMLElement | null;
      if (target?.closest("[data-allow-wheel]")) return; // e.g. the debug panel
      ev.preventDefault();
      const factor = ev.deltaMode === 1 ? 33 : ev.deltaMode === 2 ? window.innerHeight : 1;
      scroller.scrollTop += ev.deltaY * factor;
    };

    /* keyboard scrolling when focus is not inside a control */
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.defaultPrevented || ev.altKey || ev.ctrlKey || ev.metaKey) return;
      const target = ev.target as HTMLElement | null;
      if (target && target !== document.body && target !== scroller) {
        if (target.closest("a, button, input, select, textarea, [contenteditable], [role='menu']")) return;
      }
      const page = scroller.clientHeight * 0.85;
      const step = scroller.clientHeight * 0.35;
      let delta = 0;
      switch (ev.key) {
        case "ArrowDown":
          delta = step;
          break;
        case "ArrowUp":
          delta = -step;
          break;
        case "PageDown":
        case " ":
          delta = ev.shiftKey ? -page : page;
          break;
        case "PageUp":
          delta = -page;
          break;
        case "Home":
          delta = -scroller.scrollTop;
          break;
        case "End":
          delta = scroller.scrollHeight;
          break;
        default:
          return;
      }
      ev.preventDefault();
      scroller.scrollBy({ top: delta, behavior: "smooth" });
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    scroller.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(smoothRaf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      scroller.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <main
      ref={scrollerRef}
      className={styles.scroller}
      data-experience-state={plan.state}
      tabIndex={-1}
    >
      <h1 className="sr-only">
        {COMPANY.name} — {COMPANY.vision}
      </h1>

      {/* scroll length */}
      <div style={{ height: `${SCROLL_SECTIONS * 100}vh`, pointerEvents: "none" }} aria-hidden="true" />

      {/* 3D lunar micro-grid */}
      <TownCanvas
        progressRef={progressRef}
        themeRef={themeRef}
        loopRef={loopRef}
        active={plan.lunarActive}
        suspended={plan.lunarSuspended}
        reducedMotion={reducedMotion}
      />

      {/* subtle vignette for a polished, cinematic feel */}
      <div className={styles.vignette} aria-hidden="true" />

      {/* film grain (?grain=0 hides it, to A/B compositing on Safari) */}
      {debug.grain && <div className={styles.grain} aria-hidden="true" />}

      {/* intro fade from black */}
      <div className={styles.introFade} aria-hidden="true" />

      {/* progress rail with chapter ticks */}
      <div className={styles.rail} aria-hidden="true">
        {CHAPTERS.map((c) => (
          <div
            key={c.id}
            className={styles.railTick}
            style={{ top: `${((c.start + c.end) / 2) * 100}%` }}
          />
        ))}
        <div ref={railDotRef} className={styles.railDot} />
      </div>

      {/* chapter overlays */}
      {CHAPTERS.map((c, i) => (
        <div
          key={c.id}
          ref={(el) => {
            chapterRefs.current[i] = el;
          }}
          className={styles.chapter}
          data-align={c.align}
          data-hero={i === 0}
        >
          <div className={styles.chapterInner}>
            <div className={styles.kicker}>{c.kicker}</div>
            <h2 className={styles.chapterTitle}>{c.title}</h2>
            {c.sub && <p className={styles.sub}>{c.sub}</p>}
            {c.body && <p className={styles.body}>{c.body}</p>}
            {c.link && (
              <a
                className={styles.chapterLink}
                href={c.link.href}
                target={c.link.external ? "_blank" : undefined}
                rel={c.link.external ? "noopener noreferrer" : undefined}
              >
                {c.link.label}
                {c.link.external && <span aria-hidden="true"> ↗</span>}
                {c.link.external && <span className="sr-only"> (opens external site)</span>}
              </a>
            )}
          </div>
        </div>
      ))}

      {/* scroll hint */}
      <div ref={hintRef} className={styles.hint} aria-hidden="true">
        <span>SCROLL</span>
        <span className={styles.hintArrow}>↓</span>
      </div>

      {/* jump straight to the interior */}
      <button
        ref={skipRef}
        type="button"
        className={styles.skip}
        onClick={() => {
          prefetchInterior();
          scrollToProgress(1);
        }}
      >
        Skip to Presence <span aria-hidden="true">↓</span>
      </button>

      <SiteHeader
        variant="immersive"
        current="vision"
        onNavigate={{ vision: () => scrollToProgress(0) }}
        actions={
          <button
            type="button"
            onClick={toggleTheme}
            className={styles.themeToggle}
            data-night={night}
            aria-pressed={night}
            aria-label="Lunar night mode"
          >
            {night ? "◐ NIGHT" : "◑ DAY"}
          </button>
        }
      />

      {/* final destination: inside the Dome, the Spirit Connect workspace */}
      <div ref={portalWrapRef} className={styles.portal}>
        {plan.presenceMounted && (
          <PresenceInterior
            night={night}
            active={plan.presenceActive}
            entranceKey={entranceKey}
            revealed={revealed}
            arrivalRef={arrivalRef}
          />
        )}
      </div>

      {/* WELCOME caption over the airlock approach */}
      <div ref={captionRef} className={styles.caption} aria-hidden="true">
        <div className={styles.captionText}>WELCOME TO SPIRIT CONNECT</div>
      </div>

      {/* screen-reader summary of the visual journey */}
      <nav className="sr-only" aria-label="Journey chapters">
        <ol>
          {CHAPTERS.map((c) => (
            <li key={c.id}>
              {c.kicker}: {c.title}. {c.sub} {c.body}
            </li>
          ))}
        </ol>
      </nav>

      <Footer variant="fixed" />
    </main>
  );
}
