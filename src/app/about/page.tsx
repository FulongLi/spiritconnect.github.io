import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import Footer from "@/components/overlay/components/Footer/Footer";
import { Reveal } from "@/components/presence/PageEffects";
import { COMPANY, DIVISIONS, VISION_LOOP } from "@/content/site";
import { NEWS_ITEMS } from "@/content/news";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "About",
  description:
    "Spirit Connect closes the loop between AI and energy: energy powers AI, and AI designs energy. Presence is its interface to intelligent systems; AIPE its engineering division.",
  alternates: { canonical: "/about" },
};

// loop diagram geometry (SVG units)
const R = 150;
const C = 200;
const nodes = VISION_LOOP.map((step, i) => {
  const a = (i / VISION_LOOP.length) * Math.PI * 2 - Math.PI / 2;
  return { ...step, x: C + Math.cos(a) * R, y: C + Math.sin(a) * R };
});

export default function AboutPage() {
  const divisions = [DIVISIONS.presence, DIVISIONS.aipe];
  return (
    <>
      <SiteHeader current="about" />
      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="about-title">
          <p className={styles.kicker}>ABOUT {COMPANY.name.toUpperCase()}</p>
          <h1 id="about-title" className={styles.title}>
            {COMPANY.vision}
          </h1>
          <p className={styles.lead}>
            {COMPANY.name} is building a self-improving loop between AI and energy. Energy
            systems power computation. AI learns to understand those systems — and designs
            better ones. Every improved system returns new data, and the loop continues.
          </p>
        </section>

        <section id="vision" className={styles.section} aria-labelledby="loop-title">
          <div className={styles.loop}>
            <Reveal className={styles.diagram}>
              <svg viewBox="0 0 400 400" role="img" aria-labelledby="loop-svg-title">
                <title id="loop-svg-title">
                  The Spirit Connect loop: {VISION_LOOP.map((s) => s.label).join(", then ")}, and back to
                  the start.
                </title>
                <circle className={styles.ring} cx={C} cy={C} r={R} />
                <circle className={styles.ringFlow} cx={C} cy={C} r={R} />
                {nodes.map((n) => (
                  <g key={n.id}>
                    <circle className={styles.node} cx={n.x} cy={n.y} r={7} />
                    <circle className={styles.nodeHalo} cx={n.x} cy={n.y} r={15} />
                  </g>
                ))}
                <text className={styles.core} x={C} y={C - 6} textAnchor="middle">
                  AI ⇄ ENERGY
                </text>
                <text className={styles.coreSub} x={C} y={C + 16} textAnchor="middle">
                  SELF-IMPROVING LOOP
                </text>
              </svg>
            </Reveal>
            <div>
              <p className={styles.kicker}>THE LOOP</p>
              <h2 id="loop-title" className={styles.h2}>
                ENERGY POWERS AI.
                <br />
                AI DESIGNS ENERGY.
              </h2>
              <ol className={styles.steps}>
                {VISION_LOOP.map((step, i) => (
                  <Reveal as="li" key={step.id} className={styles.step} delay={i * 70}>
                    <span className={styles.stepIndex}>0{i + 1}</span>
                    <div>
                      <h3 className={styles.stepTitle}>{step.label}</h3>
                      <p className={styles.stepBody}>{step.detail}</p>
                    </div>
                  </Reveal>
                ))}
              </ol>
              <Link className={styles.textLink} href="/">
                Experience the journey <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="divisions-title">
          <p className={styles.kicker}>STRUCTURE</p>
          <h2 id="divisions-title" className={styles.h2}>
            ONE COMPANY. TWO DIRECTIONS.
          </h2>
          <div className={styles.divisions}>
            {divisions.map((d, i) => (
              <Reveal key={d.id} className={styles.division} delay={i * 100}>
                <p className={styles.divisionRole}>{d.role}</p>
                <h3 className={styles.divisionName}>{d.name}</h3>
                <p className={styles.divisionSummary}>{d.summary}</p>
                {d.external ? (
                  <a className={styles.textLink} href={d.href} target="_blank" rel="noopener noreferrer">
                    Explore {d.name} <span aria-hidden="true">↗</span>
                    <span className="sr-only"> (opens external site)</span>
                  </a>
                ) : (
                  <Link className={styles.textLink} href={d.href}>
                    Explore {d.name} <span aria-hidden="true">→</span>
                  </Link>
                )}
              </Reveal>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="news-title">
          <p className={styles.kicker}>LATEST NEWS</p>
          <h2 id="news-title" className={styles.h2}>
            NEWS
          </h2>
          <ol className={styles.news}>
            {NEWS_ITEMS.map((item) => (
              <li key={`${item.date}-${item.text.slice(0, 16)}`} className={styles.newsItem}>
                <span className={styles.newsDate}>{item.date}</span>
                <p className={styles.newsText}>{item.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={`${styles.section} ${styles.company}`} aria-label="Company">
          <p>
            {COMPANY.legalName} · Founded {COMPANY.founded} · {COMPANY.domain}
          </p>
        </section>
      </main>
      <Footer variant="page" />
    </>
  );
}
