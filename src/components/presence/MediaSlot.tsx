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

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
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
      {/* looping motion must be pausable (WCAG 2.2.2); under reduced motion
          the animation waits on its poster frame until started here */}
      {hasMedia && config.kind === "animation" && (
        <button
          type="button"
          className={styles.playToggle}
          onClick={togglePlayback}
          aria-label={playing ? "Pause animation" : "Play animation"}
          data-playing={playing}
        >
          <span className={styles.playIcon} aria-hidden="true" />
        </button>
      )}
    </figure>
  );
}
