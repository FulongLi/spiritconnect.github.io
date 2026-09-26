import Link from "next/link";
import { AIPE_SCREEN, PRESENCE_SCREEN, WORKSPACE } from "@/content/workspace";
import PresenceOrb from "@/components/presence/PresenceOrb";
import styles from "./WorkspaceFallback.module.css";

/**
 * The workspace without WebGL 2: the same arrangement (Presence device,
 * two equal monitors, the desk edge) drawn with HTML / CSS and the 2D
 * Presence orb.
 */
export default function WorkspaceFallback({ tabIndex }: { tabIndex?: number }) {
  return (
    <div className={styles.room}>
      <div className={styles.monitors}>
        <Link className={styles.monitor} href={PRESENCE_SCREEN.href} tabIndex={tabIndex}>
          <span className={styles.eyebrow}>AI / INTERFACE</span>
          <span className={styles.title}>{PRESENCE_SCREEN.title}</span>
          <span className={styles.line}>{PRESENCE_SCREEN.tagline}</span>
          <span className={styles.cta}>
            {PRESENCE_SCREEN.cta} <span aria-hidden="true">→</span>
          </span>
        </Link>
        <a
          className={styles.monitor}
          href={AIPE_SCREEN.href}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={tabIndex}
        >
          <span className={styles.eyebrow}>ENERGY / ENGINEERING</span>
          <span className={styles.title}>{AIPE_SCREEN.title}</span>
          <span className={styles.line}>{AIPE_SCREEN.headline}</span>
          <span className={styles.cta}>
            {AIPE_SCREEN.cta} <span aria-hidden="true">↗</span>
            <span className="sr-only"> (opens external site)</span>
          </span>
        </a>
      </div>
      <div className={styles.device} aria-hidden="true">
        <div className={styles.chamber}>
          <PresenceOrb scale={0.36} intensity={0.9} />
        </div>
        <div className={styles.speaker} />
      </div>
      <div className={styles.desk} aria-hidden="true">
        <span>{WORKSPACE.loop}</span>
      </div>
    </div>
  );
}
