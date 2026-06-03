"use client";

import styles from "./BrandInfoPanel.module.css";
import type { BrandBranch } from "./brands";

type BrandInfoPanelProps = {
  branch: BrandBranch;
  visible?: boolean;
};

export default function BrandInfoPanel({ branch, visible = true }: BrandInfoPanelProps) {
  return (
    <aside
      className={`${styles.panel} ${visible ? styles.visible : styles.hidden}`}
      style={{ "--branch-accent": branch.accent } as React.CSSProperties}
      aria-live="polite"
    >
      <div className={styles.scanline} />
      <p className={styles.eyebrow}>{branch.eyebrow}</p>
      <h2>{branch.title}</h2>
      <p className={styles.summary}>{branch.summary}</p>
      <p className={styles.detail}>{branch.detail}</p>

      <div className={styles.metaGrid}>
        <div>
          <span>Status</span>
          <strong>{branch.status}</strong>
        </div>
        <div>
          <span>Signal</span>
          <strong>{branch.label}</strong>
        </div>
      </div>

      <div className={styles.keywords} aria-label="Branch keywords">
        {branch.keywords.map((keyword) => (
          <span key={keyword}>{keyword}</span>
        ))}
      </div>

      <a className={styles.link} href={branch.href}>
        Open branch
        <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
          <path
            d="M4 11L11 4M6 4h5v5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.4"
          />
        </svg>
      </a>
    </aside>
  );
}
