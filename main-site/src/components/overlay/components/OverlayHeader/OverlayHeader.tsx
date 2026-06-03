"use client";

import styles from "./OverlayHeader.module.css";

interface OverlayHeaderProps {
  visible?: boolean;
}

export default function OverlayHeader({ visible = true }: OverlayHeaderProps) {
  return (
    <div className={`${styles.root} ${visible ? styles.visible : styles.hidden}`}>
      <div className={styles.eyebrow}>
        BRAND PORTAL · PARTICLE FORM · WEBGPU
      </div>

      <div className={styles.rule} />

      <h1 className={styles.title}>
        SPIRIT CONNECT
      </h1>

      <div className={styles.subtitle}>
        灵接科技
      </div>

      <div className={styles.meta}>
        HOLOGRAPHIC BRAND SYSTEM
        <br />
        CONNECTING TECHNOLOGY AND CREATIVITY
      </div>

      <p className={styles.copy}>
        Rotate through the Spirit Connect branches. Each particle model acts as
        an entry point into a focused field: AI, gaming, art, and power systems.
      </p>
    </div>
  );
}
