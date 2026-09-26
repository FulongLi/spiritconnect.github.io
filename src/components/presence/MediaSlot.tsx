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
  className?: string;
};

/**
 * A framed media area for Presence product media. While the final asset is
 * not configured (see src/content/presence.ts → PRESENCE_MEDIA) it shows a
 * labelled placeholder — it never pretends to be the real product footage.
 */
export default function MediaSlot({ config, priority = false, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = useReducedMotion();
  const [failed, setFailed] = useState(false);
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

  // respect reduced motion for the autoplaying hero animation
  useEffect(() => {
    const video = videoRef.current;
    if (!video || config.kind !== "animation") return;
    if (reducedMotion) video.pause();
    else video.play().catch(() => {});
  }, [reducedMotion, config.kind]);

  const poster = config.poster ? assetPath(config.poster) : undefined;

  let content: React.ReactNode;
  if (!hasMedia) {
    content = (
      <div className={styles.placeholder}>
        <PresenceOrb scale={0.26} intensity={0.55} className={styles.placeholderOrb} />
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
        controls={!isAnimation || reducedMotion}
        preload={priority ? "auto" : "metadata"}
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
      style={{ aspectRatio: config.aspectRatio }}
      data-empty={!hasMedia}
    >
      <span className={`${styles.corner} ${styles.tl}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.tr}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.bl}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.br}`} aria-hidden="true" />
      {content}
    </figure>
  );
}
