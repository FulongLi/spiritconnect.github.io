import type { ReactNode } from "react";
import styles from "./FutureAction.module.css";

type Props = {
  /** the destination from src/content/pricing.ts → PRESENCE_RELEASE; null while it isn't live */
  href: string | null;
  /** stable id for the pending note, so the unavailable control can reference it */
  id: string;
  className: string;
  /** shown under the control, and announced with it, while `href` is unset */
  pendingNote: string;
  /** how the control and its note line up in the pending state (default: centred) */
  align?: "center" | "start";
  children: ReactNode;
};

/**
 * A call to action whose destination goes live later (Try Presence, Pre-order).
 *
 * With a URL it is an ordinary link. Without one it never pretends: no href,
 * no fake page — the control is announced as an unavailable link, stays
 * focusable so keyboard and screen-reader users reach the explanation, and
 * the note says what is coming. Setting the URL in one place activates it.
 */
export default function FutureAction({ href, id, className, pendingNote, align = "center", children }: Props) {
  const url = href?.trim();
  if (url) {
    return (
      <a href={url} className={className} rel="noopener">
        {children} <span aria-hidden="true">→</span>
      </a>
    );
  }

  const noteId = `${id}-note`;
  return (
    <div className={styles.pending} data-align={align}>
      <span
        role="link"
        aria-disabled="true"
        aria-describedby={noteId}
        tabIndex={0}
        className={`${className} ${styles.control}`}
      >
        {children}
      </span>
      <p id={noteId} className={styles.note}>
        {pendingNote}
      </p>
    </div>
  );
}
