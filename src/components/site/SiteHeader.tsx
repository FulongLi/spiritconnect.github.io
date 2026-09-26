"use client";

import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import { COMPANY, MAIN_NAV, type NavItem } from "@/content/site";
import styles from "./SiteHeader.module.css";

type Props = {
  /** id of the current section, highlighted in the nav */
  current?: NavItem["id"];
  /** intercept a nav item (e.g. "vision" scrolls the journey back to the top) */
  onNavigate?: Partial<Record<NavItem["id"], () => void>>;
  /** extra controls on the right, e.g. the lunar day / night toggle */
  actions?: ReactNode;
  /** transparent over immersive scenes, solid-on-scroll on content pages */
  variant?: "immersive" | "page";
};

export default function SiteHeader({ current, onNavigate, actions, variant = "page" }: Props) {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const renderItem = (item: NavItem) => {
    const handler = onNavigate?.[item.id];
    const isCurrent = current === item.id;
    const content = (
      <>
        {item.label}
        {item.external && (
          <span className={styles.external} aria-hidden="true">
            ↗
          </span>
        )}
        {item.external && <span className="sr-only"> (opens external site)</span>}
      </>
    );
    if (item.external) {
      return (
        <a className={styles.link} href={item.href} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      );
    }
    return (
      <Link
        className={styles.link}
        href={item.href}
        aria-current={isCurrent ? "page" : undefined}
        onClick={(e) => {
          setOpen(false);
          if (handler) {
            e.preventDefault();
            handler();
          }
        }}
      >
        {content}
      </Link>
    );
  };

  return (
    <header className={`${styles.header} ${styles[variant]}`}>
      <Link className={styles.wordmark} href="/" aria-label={`${COMPANY.name} — home`}>
        SPIRIT CONNECT
      </Link>

      <div className={styles.right}>
        <nav aria-label="Main">
          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((v) => !v)}
          >
            <span className={styles.menuIcon} data-open={open} aria-hidden="true" />
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
          <ul id={menuId} className={styles.list} data-open={open}>
            {MAIN_NAV.map((item) => (
              <li key={item.id}>{renderItem(item)}</li>
            ))}
          </ul>
        </nav>
        {actions}
      </div>
    </header>
  );
}
