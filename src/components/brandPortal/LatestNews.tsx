"use client";

import styles from "./LatestNews.module.css";

const NEWS_ITEMS = [
  {
    date: "JUN 2026",
    text: "Spirit Connect brand portal now opens in dark mode by default.",
  },
  {
    date: "JUN 2026",
    text: "Branch showcase aligned across Spirit Connect, Power Labs, AI, Gaming, and Art.",
  },
  {
    date: "JUN 2026",
    text: "All models now share the Spirit Connect light-blue holographic material.",
  },
  {
    date: "JUN 2026",
    text: "Power Labs branch links directly to the research portal.",
  },
];

export default function LatestNews() {
  const tickerItems = [...NEWS_ITEMS, ...NEWS_ITEMS];

  return (
    <aside className={styles.root} aria-label="Latest news">
      <div className={styles.eyebrow}>LATEST NEWS</div>
      <div className={styles.rule} />
      <div className={styles.viewport}>
        <div className={styles.track}>
          {tickerItems.map((item, index) => (
            <article className={styles.item} key={`${item.date}-${index}`}>
              <span>{item.date}</span>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </aside>
  );
}
