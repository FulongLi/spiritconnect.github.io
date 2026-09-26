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

export default function JourneyExperience() {
  const progressRef = useRef(0);
  const themeRef = useRef(0);
  const loopRef = useRef(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const chapterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hintRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const portalWrapRef = useRef<HTMLDivElement>(null);
  const railDotRef = useRef<HTMLDivElement>(null);
  const blackoutRef = useRef<HTMLDivElement>(null);
  const mistRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const planRef = useRef<RenderPlan>(INITIAL_PLAN);
  const lastProgressRef = useRef(-1);

  const [night, setNight] = useState(false);
  const [plan, setPlan] = useState<RenderPlan>(INITIAL_PLAN);
  const [entranceKey, setEntranceKey] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const reducedMotion = useReducedMotion();

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

    /* all scroll-linked DOM updates, run at most once per frame */
    const update = () => {
      raf = 0;
      const max = scroller.scrollHeight - scroller.clientHeight;
      const r = max > 0 ? scroller.scrollTop / max : 0;
      const p = scrollToStory(r);
      const prev = lastProgressRef.current;
      lastProgressRef.current = p;
      progressRef.current = p;
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
        const o = clamp01((TIMELINE.mistStart - p) / 0.04);
        skipRef.current.style.opacity = o.toFixed(3);
        skipRef.current.style.visibility = o <= 0.001 ? "hidden" : "visible";
      }

      /* progress rail indicator */
      if (railDotRef.current) {
        railDotRef.current.style.top = `${(p * 100).toFixed(2)}%`;
      }

      /* dark beat while crossing the hull */
      if (blackoutRef.current) {
        const o = clamp01((p - TIMELINE.blackoutStart) / (TIMELINE.blackoutEnd - TIMELINE.blackoutStart));
        blackoutRef.current.style.opacity = o.toFixed(3);
      }

      /* mist veil between the dome shell and the interior */
      if (mistRef.current) {
        const firstRise = clamp01((p - TIMELINE.mistStart) / (TIMELINE.mistFill - TIMELINE.mistStart));
        const firstClear = clamp01(
          (TIMELINE.mistWelcomeClear - p) / (TIMELINE.mistWelcomeClear - TIMELINE.mistFill),
        );
        const secondRise = clamp01(
          (p - TIMELINE.mistSecondRise) / (TIMELINE.mistSecondPeak - TIMELINE.mistSecondRise),
        );
        const secondClear = clamp01((TIMELINE.mistEnd - p) / (TIMELINE.mistEnd - TIMELINE.mistSecondPeak));
        const cover = Math.max(firstRise * firstClear, secondRise * secondClear);
        const density = Math.min(1, 0.14 + cover * 0.9);
        mistRef.current.style.opacity = cover <= 0.001 ? "0" : density.toFixed(3);
        mistRef.current.style.transform = `translate3d(0, ${((1 - cover) * 34).toFixed(1)}vh, 0) scale(${(1.08 + cover * 0.1).toFixed(3)})`;
        mistRef.current.style.visibility = cover <= 0.001 ? "hidden" : "visible";
      }

      /* WELCOME caption inside the dark beat */
      if (captionRef.current) {
        const inO = clamp01((p - TIMELINE.captionIn) / 0.022);
        const outO = clamp01((TIMELINE.captionOut - p) / 0.022);
        captionRef.current.style.opacity = (inO * outO).toFixed(3);
      }

      /* interior crossfade */
      const wrap = portalWrapRef.current;
      if (wrap) {
        const o = clamp01(
          (p - TIMELINE.portalFadeStart) / (TIMELINE.portalFadeEnd - TIMELINE.portalFadeStart),
        );
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

      /* particles assemble each time the interior comes into view */
      if (p >= TIMELINE.portalFadeStart && prev < TIMELINE.portalFadeStart) {
        setEntranceKey((k) => k + 1);
      }
      setRevealed(p >= TIMELINE.interiorReveal);
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
        flightEnd={TIMELINE.flightEnd}
        active={plan.lunarActive}
        suspended={plan.lunarSuspended}
        reducedMotion={reducedMotion}
      />

      {/* subtle vignette for a polished, cinematic feel */}
      <div className={styles.vignette} aria-hidden="true" />

      {/* film grain */}
      <div className={styles.grain} aria-hidden="true" />

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

      {/* dark beat after the first fog wave swallows the dome interior */}
      <div ref={blackoutRef} className={styles.blackout} aria-hidden="true" />

      {/* WELCOME caption sits above the fog so it can emerge from the haze */}
      <div ref={captionRef} className={styles.caption} aria-hidden="true">
        <div className={styles.captionText}>WELCOME TO SPIRIT CONNECT</div>
      </div>

      {/* mist veil for the dome-to-interior transition */}
      <div ref={mistRef} className={styles.mist} aria-hidden="true">
        <div className={styles.mistNoise} />
        <div className={styles.mistBillow} />
      </div>

      {/* final destination: the Spirit Connect interior, home of Presence */}
      <div ref={portalWrapRef} className={styles.portal}>
        {plan.presenceMounted && (
          <PresenceInterior
            night={night}
            active={plan.presenceActive}
            entranceKey={entranceKey}
            revealed={revealed}
          />
        )}
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
