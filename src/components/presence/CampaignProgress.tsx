"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { CAMPAIGN_PROGRESS_COPY as COPY } from "@/content/presence";
import { FOUNDING_CAMPAIGN } from "@/content/campaign";
import { formatCount } from "@/content/pricing";
import { getProgressSource, initialProgress, type CampaignProgress as Progress } from "@/lib/campaign/progress";
import styles from "./CampaignProgress.module.css";

/** the particle field: one point per founding place, filled column by column */
const ROWS = 25;
const COLS = Math.ceil(FOUNDING_CAMPAIGN.target / ROWS);

/** clip-path that lights the first `n` points, column-major */
function litRegion(n: number) {
  const cols = Math.floor(n / ROWS);
  const rem = n % ROWS;
  const x0 = (cols / COLS) * 100;
  const x1 = ((cols + (rem ? 1 : 0)) / COLS) * 100;
  const y = (rem / ROWS) * 100;
  return `polygon(0 0, ${x1}% 0, ${x1}% ${y}%, ${x0}% ${y}%, ${x0}% 100%, 0 100%)`;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

/**
 * Founding 1,000 progress. Shows a count only when an authoritative source
 * reports one (src/lib/campaign/progress.ts); before the campaign opens it
 * shows the target and says so — the field stays unlit.
 */
export default function CampaignProgress() {
  const [progress, setProgress] = useState<Progress>(initialProgress);

  useEffect(() => {
    if (FOUNDING_CAMPAIGN.phase === "pre-launch") return;
    let cancelled = false;
    getProgressSource()
      .read()
      .then((p) => {
        if (!cancelled) setProgress(p);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const live = progress.status === "live" ? progress : null;
  const lit = live ? Math.min(live.confirmed, live.target) : 0;
  const status = live
    ? COPY.asOf(formatDate(live.asOf))
    : progress.status === "pre-launch"
      ? COPY.preLaunchStatus
      : COPY.unavailableStatus;

  return (
    <div className={styles.progress} data-status={progress.status}>
      <div className={styles.head}>
        <span className={styles.label}>{COPY.label}</span>
        <span className={styles.status}>{status}</span>
      </div>

      <div
        className={styles.field}
        style={{ "--cols": COLS, "--rows": ROWS } as CSSProperties}
        {...(live
          ? {
              role: "progressbar",
              "aria-valuemin": 0,
              "aria-valuemax": live.target,
              "aria-valuenow": lit,
              "aria-valuetext": COPY.liveValueText(formatCount(live.confirmed)),
              "aria-label": COPY.label,
            }
          : { "aria-hidden": true })}
      >
        {live && <div className={styles.lit} style={{ clipPath: litRegion(lit) }} />}
      </div>

      {live ? (
        <p className={styles.count}>
          <strong>{formatCount(live.confirmed)}</strong> {COPY.liveUnit}
        </p>
      ) : (
        <p className={styles.note}>
          {progress.status === "pre-launch" ? COPY.preLaunchNote : COPY.unavailableNote}
        </p>
      )}
    </div>
  );
}
