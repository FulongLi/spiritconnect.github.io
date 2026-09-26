"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { requestMediaPlay } from "./MediaSlot";

/** In-page link that scrolls to the demo and starts it when available. */
export function WatchDemoLink({
  href,
  slotId,
  className,
  children,
}: {
  href: string;
  slotId: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={() => {
        // let the browser scroll to the anchor, then ask the video to play
        window.setTimeout(() => requestMediaPlay(slotId), 450);
      }}
    >
      {children}
    </a>
  );
}

/**
 * Fades its children in as they scroll into view. Content is visible by
 * default without JavaScript; the effect only adds the reveal animation.
 */
export function Reveal({
  children,
  className,
  as: Tag = "div",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "li";
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) return; // already on screen
    el.dataset.reveal = "pending";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.reveal = "shown";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.RefObject<never>}
      className={className}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
