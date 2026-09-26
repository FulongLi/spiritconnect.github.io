"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { MediaSlotConfig, MediaSource } from "@/content/presence";
import { assetPath } from "@/components/shared/assetPath";
import { useReducedMotion } from "@/lib/hooks/useMediaQuery";
import PresenceOrb from "./PresenceOrb";
import styles from "./MediaSlot.module.css";

/** Ask a video slot to start playing (used by "Watch Demo"). */
export const PLAY_MEDIA_EVENT = "presence-media:play";

export function requestMediaPlay(slotId: string) {
  window.dispatchEvent(new CustomEvent(PLAY_MEDIA_EVENT, { detail: slotId }));
}

/*
 * Responsive video sources (`media` on a source) are chosen on the client.
 * WebKit evaluates <source media> while parsing — before this page has a
 * laid-out viewport — so desktop Safari always matched the phone encode.
 * The static HTML therefore ships only the poster; after hydration the first
 * matching source is picked once per slot (resizing never swaps the file
 * mid-playback) and inserting it starts loading / muted autoplay.
 */
const chosenSource = new Map<string, number>();
const subscribeNever = () => () => {};

function pickSource(id: string, sources: MediaSource[]) {
  if (!chosenSource.has(id)) {
    const i = sources.findIndex((s) => !s.media || window.matchMedia(s.media).matches);
    chosenSource.set(id, i === -1 ? sources.length - 1 : i);
  }
  return chosenSource.get(id)!;
}

/** the visitor's "Sound on" choice for the hero, remembered for the session */
const SOUND_PREF_KEY = "presence:hero-sound";

function readSoundPref() {
  try {
    return sessionStorage.getItem(SOUND_PREF_KEY) === "on";
  } catch {
    return false;
  }
}

function writeSoundPref(on: boolean) {
  try {
    sessionStorage.setItem(SOUND_PREF_KEY, on ? "on" : "off");
  } catch {
    /* storage unavailable (private mode etc.) — the choice just isn't remembered */
  }
}

/**
 * Unmute and make sure the animation is running. Must be called from a user
 * gesture. If the browser still refuses audible playback, fall back to muted
 * playback rather than leaving the animation stopped.
 */
function enableSound(video: HTMLVideoElement) {
  video.muted = false;
  if (!video.paused) return;
  video.play().catch(() => {
    video.muted = true;
    video.play().catch(() => {});
  });
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg className={styles.speaker} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M2.5 6h2.2L8 3.2v9.6L4.7 10H2.5z" fill="currentColor" />
      {muted ? (
        <path d="M11 6l3.5 4M14.5 6L11 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      ) : (
        <path
          d="M10.6 5.6a3.4 3.4 0 010 4.8M12.4 3.9a5.8 5.8 0 010 8.2"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  );
}

type Props = {
  config: MediaSlotConfig;
  /** load eagerly (above the fold) */
  priority?: boolean;
  /**
   * "ambient": no frame — the media dissolves into the page background (the
   * hero animation is rendered on pure black, like the page).
   * "framed": a quiet glass surface for user-started media.
   */
  variant?: "ambient" | "framed";
  className?: string;
};

/**
 * A media area for Presence product media. While the final asset is not
 * configured (see src/content/presence.ts → PRESENCE_MEDIA) it shows a
 * labelled placeholder — it never pretends to be the real product footage.
 */
export default function MediaSlot({ config, priority = false, variant = "framed", className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const soundButtonRef = useRef<HTMLButtonElement>(null);
  const hasMedia = config.sources.length > 0 && !failed;
  const responsive = config.sources.some((s) => s.media);
  const sourceIndex = useSyncExternalStore(
    subscribeNever,
    () => (responsive ? pickSource(config.id, config.sources) : -1),
    () => -1,
  );
  const videoSources = responsive
    ? sourceIndex === -1
      ? []
      : [config.sources[sourceIndex]]
    : config.sources;

  useEffect(() => {
    if (config.kind !== "video") return;
    const onPlay = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== config.id) return;
      videoRef.current?.play().catch(() => {});
    };
    window.addEventListener(PLAY_MEDIA_EVENT, onPlay);
    return () => window.removeEventListener(PLAY_MEDIA_EVENT, onPlay);
  }, [config.id, config.kind]);

  // respect reduced motion for the autoplaying hero animation: stop, and
  // reload so the poster shows (an autoplay attempt from the static HTML
  // hides the poster even if playback never advanced)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || config.kind !== "animation") return;
    if (responsive && sourceIndex === -1) return; // source not chosen yet
    if (reducedMotion) {
      video.pause();
      video.load();
    } else {
      // a source inserted after hydration isn't picked up by every browser
      // (Chrome leaves it unloaded) — load it explicitly
      if (responsive) video.load();
      video.muted = true;
      video.play().catch(() => {});
    }
  }, [reducedMotion, config.kind, responsive, sourceIndex]);

  // mirror the animation's play state for its pause / play toggle
  useEffect(() => {
    const video = videoRef.current;
    if (!video || config.kind !== "animation") return;
    const sync = () => setPlaying(!video.paused);
    const initial = window.setTimeout(sync, 0); // it may already be autoplaying
    video.addEventListener("play", sync);
    video.addEventListener("pause", sync);
    return () => {
      window.clearTimeout(initial);
      video.removeEventListener("play", sync);
      video.removeEventListener("pause", sync);
    };
  }, [config.kind, hasMedia]);

  // sound: `config.hasAudio` is authoritative — the control is always shown
  // for assets that declare a sound track (runtime probes such as
  // audioTracks / webkitAudioDecodedByteCount are unreliable in WebKit and
  // hid the control in Safari). Mirror the muted state, and re-apply a
  // "Sound on" choice from earlier in the session on the visitor's first
  // interaction (audible playback needs a user gesture, so not on load).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || config.kind !== "animation" || !config.hasAudio) return;
    const onVolume = () => setMuted(video.muted);
    video.addEventListener("volumechange", onVolume);

    const restore = (e: Event) => {
      if (soundButtonRef.current?.contains(e.target as Node)) return; // the toggle handles itself
      window.removeEventListener("click", restore, true);
      window.removeEventListener("keydown", restore, true);
      if (readSoundPref()) enableSound(video);
    };
    if (readSoundPref()) {
      window.addEventListener("click", restore, true);
      window.addEventListener("keydown", restore, true);
    }
    return () => {
      video.removeEventListener("volumechange", onVolume);
      window.removeEventListener("click", restore, true);
      window.removeEventListener("keydown", restore, true);
    };
  }, [config.kind, config.hasAudio, hasMedia]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    const turnOn = video.muted;
    // sound belongs to the moving animation — asking for it also starts playback
    if (turnOn) enableSound(video);
    else video.muted = true;
    writeSoundPref(turnOn);
  };

  const poster = config.poster ? assetPath(config.poster) : undefined;

  let content: React.ReactNode;
  if (!hasMedia) {
    content = (
      <div className={styles.placeholder}>
        {/* one ambient sphere for moving media; stills get a quiet pool of light */}
        {config.kind !== "image" && (
          <PresenceOrb scale={0.24} intensity={0.7} className={styles.placeholderOrb} />
        )}
        <div className={styles.placeholderLabel}>
          <span className={styles.placeholderDot} aria-hidden="true" />
          {config.placeholder}
        </div>
        {process.env.NODE_ENV !== "production" && (
          <code className={styles.assetHint}>Asset slot → {config.assetHint}</code>
        )}
      </div>
    );
  } else if (config.kind === "image") {
    content = (
      // eslint-disable-next-line @next/next/no-img-element -- static export, pre-optimised asset
      <img
        className={styles.media}
        src={assetPath(config.sources[0].src)}
        alt={config.alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  } else {
    const isAnimation = config.kind === "animation";
    content = (
      <video
        ref={videoRef}
        className={styles.media}
        poster={poster}
        playsInline
        muted={isAnimation}
        loop={isAnimation}
        autoPlay={isAnimation && !reducedMotion}
        controls={!isAnimation}
        preload={priority && !(isAnimation && reducedMotion) ? "auto" : "metadata"}
        disablePictureInPicture={isAnimation}
        aria-label={config.alt}
        onError={() => setFailed(true)}
      >
        {videoSources.map((s) => (
          <source key={s.src} src={assetPath(s.src)} type={s.type} />
        ))}
      </video>
    );
  }

  return (
    <figure
      className={`${styles.frame} ${className ?? ""}`}
      style={{ "--slot-ratio-default": config.aspectRatio } as React.CSSProperties}
      data-variant={variant}
      data-kind={config.kind}
      data-empty={!hasMedia}
    >
      {content}
      {hasMedia && config.kind === "animation" && (
        <div className={styles.controls}>
          {config.hasAudio && (
            <button
              ref={soundButtonRef}
              type="button"
              className={styles.soundToggle}
              onClick={toggleSound}
              aria-label={muted ? "Sound on: unmute the Presence animation" : "Sound off: mute the Presence animation"}
            >
              <SpeakerIcon muted={muted} />
              <span aria-hidden="true">{muted ? "Sound on" : "Sound off"}</span>
            </button>
          )}
          {/* looping motion must be pausable (WCAG 2.2.2); under reduced motion
              the animation waits on its poster frame until started here */}
          <button
            type="button"
            className={styles.playToggle}
            onClick={togglePlayback}
            aria-label={playing ? "Pause animation" : "Play animation"}
            data-playing={playing}
          >
            <span className={styles.playIcon} aria-hidden="true" />
          </button>
        </div>
      )}
    </figure>
  );
}
