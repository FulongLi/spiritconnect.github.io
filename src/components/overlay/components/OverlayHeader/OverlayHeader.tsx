"use client";

import styles from "./OverlayHeader.module.css";

interface OverlayHeaderProps {
  visible?: boolean;
}

export default function OverlayHeader({ visible = true }: OverlayHeaderProps) {
  return (
    <div className={`${styles.root} ${visible ? styles.visible : styles.hidden}`}>
      <div className={styles.eyebrow}>
        Energy helps humanity enter a Type I civilisation.
      </div>

      <div className={styles.rule} />

      <h1 className={styles.title}>
        SPIRIT CONNECT
      </h1>

      <div className={styles.meta}>
        AI FOR EVERYDAY LIFE
      </div>

      <p className={styles.copy}>
        Spirit Connect brings artificial intelligence into the many layers of
        daily life, connecting practical tools, creative systems, interactive
        experiences, and energy-aware technology.
      </p>
    </div>
  );
}
