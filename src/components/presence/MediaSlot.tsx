"use client";

import { useEffect, useRef, useState } from "react";
import type { MediaSlotConfig } from "@/content/presence";
import { assetPath } from "@/components/shared/assetPath";
import { useReducedMotion } from "@/lib/hooks/useMediaQuery";
import PresenceOrb from "./PresenceOrb";
import styles from "./MediaSlot.module.css";

/** Ask a video slot to start playing (used by "Watch Demo"). */
export const PLAY_MEDIA_EVENT = "presence-media:play";

export function requestMediaPlay(slotId: string) {
  window.dispatchEvent(new CustomEvent(PLAY_MEDIA_EVENT, { detail: slotId }));
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

type MediaWithAudioInfo = HTMLVideoElement & {
  audioTracks?: { length: number };
  mozHasAudio?: boolean;
  webkitAudioDecodedByteCount?: number;
};

/** true / false when the browser can tell whether the file has sound, null when it can't (yet) */
function detectAudio(video: MediaWithAudioInfo): boolean | null {
  if (video.audioTracks) return video.audioTracks.length > 0;
  if (typeof video.mozHasAudio === "boolean") return video.mozHasAudio;
  if (typeof video.webkitAudioDecodedByteCount === "number" && video.currentTime > 1.5) {
    return video.webkitAudioDecodedByteCount > 0;
  }
  return null;
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
  const [audioAvailable, setAudioAvailable] = useState(!!config.hasAudio);
  const soundButtonRef = useRef<HTMLButtonElement>(null);
  const hasMedia = config.sources.length > 0 && !failed;

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
    if (reducedMotion) {
      video.pause();
      video.load();
    } else {
      video.muted = true;
      video.play().catch(() => {});
    }
  }, [reducedMotion, config.kind]);

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

  // sound: mirror the muted state, hide the control if the file turns out to
  // be silent, and re-apply a "Sound on" choice from earlier in the session on
  // the visitor's first interaction (browsers only allow audible playback
  // after a user gesture, so it can't be restored on load)
  useEffect(() => {
    const video = videoRef.current as MediaWithAudioInfo | null;
    if (!video || config.kind !== "animation" || !config.hasAudio) return;
    const onVolume = () => setMuted(video.muted);
    const check = () => {
      const has = detectAudio(video);
      if (has === null) return;
      setAudioAvailable(has);
      video.removeEventListener("timeupdate", check);
    };
    video.addEventListener("volumechange", onVolume);
    video.addEventListener("loadedmetadata", check);
    video.addEventListener("timeupdate", check);

    const restore = (e: Event) => {
      if (soundButtonRef.current?.contains(e.target as Node)) return; // the toggle handles itself
      window.removeEventListener("click", restore, true);
      window.removeEventListener("keydown", restore, true);
      if (readSoundPref()) video.muted = false;
    };
    if (readSoundPref()) {
      window.addEventListener("click", restore, true);
      window.addEventListener("keydown", restore, true);
    }
    return () => {
      video.removeEventListener("volumechange", onVolume);
      video.removeEventListener("loadedmetadata", check);
      video.removeEventListener("timeupdate", check);
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
    video.muted = !turnOn;
    // sound belongs to the moving animation — asking for it starts playback
    if (turnOn && video.paused) video.play().catch(() => {});
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
        {config.sources.map((s) => (
          <source key={s.src} src={assetPath(s.src)} type={s.type} media={s.media} />
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
          {audioAvailable && (
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
