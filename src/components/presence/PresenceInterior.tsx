"use client";

import Link from "next/link";
import { COMPANY, DIVISIONS } from "@/content/site";
import { PRESENCE_STAGE } from "@/content/presence";
import PresenceStage from "./PresenceStage";
import styles from "./PresenceInterior.module.css";

type Props = {
  night: boolean;
  /** Presence renderer frames on / off (see the experience render plan) */
  active: boolean;
  /** increments each time the interior is entered → particles assemble */
  entranceKey: number;
  /** copy + CTAs are shown once the fog has cleared */
  revealed: boolean;
};

/**
 * The Spirit Connect interior: the final destination of the lunar journey.
 * Presence stands on the central stage; AIPE is present as the engineering
 * division with an external entry point.
 */
export default function PresenceInterior({ night, active, entranceKey, revealed }: Props) {
  const aipe = DIVISIONS.aipe;
  const tabIndex = revealed ? undefined : -1;

  return (
    <section
      className={styles.root}
      data-revealed={revealed}
      aria-label="Presence — inside Spirit Connect"
      aria-hidden={!revealed}
    >
      <div className={styles.stage}>
        <PresenceStage night={night} active={active} replayTrigger={entranceKey} />
      </div>

      <div className={styles.intro}>
        <p className={styles.eyebrow} style={{ "--i": 0 } as React.CSSProperties}>
          {PRESENCE_STAGE.eyebrow}
        </p>
        <div className={styles.rule} style={{ "--i": 0 } as React.CSSProperties} />
        <h2 className={styles.title} style={{ "--i": 1 } as React.CSSProperties}>
          {PRESENCE_STAGE.title}
        </h2>
        <p className={styles.tagline} style={{ "--i": 2 } as React.CSSProperties}>
          {PRESENCE_STAGE.tagline}
        </p>
        <p className={styles.body} style={{ "--i": 3 } as React.CSSProperties}>
          {PRESENCE_STAGE.body}
        </p>
        <div className={styles.actions} style={{ "--i": 4 } as React.CSSProperties}>
          <Link className={styles.cta} href={DIVISIONS.presence.href} tabIndex={tabIndex}>
            <span className={`${styles.corner} ${styles.tl}`} />
            <span className={`${styles.corner} ${styles.tr}`} />
            <span className={`${styles.corner} ${styles.bl}`} />
            <span className={`${styles.corner} ${styles.br}`} />
            {PRESENCE_STAGE.cta}
            <span aria-hidden="true">→</span>
          </Link>
          <Link
            className={styles.secondary}
            href={`${DIVISIONS.presence.href}#founding`}
            tabIndex={tabIndex}
          >
            {PRESENCE_STAGE.secondaryCta}
          </Link>
        </div>
      </div>

      <aside className={styles.division} style={{ "--i": 5 } as React.CSSProperties}>
        <div className={styles.divisionRule} />
        <p className={styles.divisionRole}>{aipe.role}</p>
        <h3 className={styles.divisionName}>{aipe.name}</h3>
        <p className={styles.divisionSummary}>{aipe.summary}</p>
        <a
          className={styles.divisionLink}
          href={aipe.href}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={tabIndex}
        >
          Explore AIPE <span aria-hidden="true">↗</span>
          <span className="sr-only"> (opens external site)</span>
        </a>
      </aside>

      <p className={styles.vision} style={{ "--i": 6 } as React.CSSProperties}>
        {COMPANY.vision}
      </p>
    </section>
  );
}
