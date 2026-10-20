import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import Footer from "@/components/overlay/components/Footer/Footer";
import { Reveal } from "@/components/presence/PageEffects";
import { AIPE_VISION, COMPANY, DIVISIONS, VISION_LOOP, type Statement } from "@/content/site";
import { NEWS_ITEMS } from "@/content/news";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "About",
  description:
    "No matter where you are, you are always connected. Spirit Connect connects people, intelligence, technology and the physical world — through Presence, the human interface to intelligent systems, and AIPE, intelligent engineering for energy and power systems.",
  alternates: { canonical: "/about" },
};

// loop diagram geometry (SVG units)
const R = 150;
const C = 200;
const nodes = VISION_LOOP.map((step, i) => {
  const a = (i / VISION_LOOP.length) * Math.PI * 2 - Math.PI / 2;
  return {
    ...step,
    x: C + Math.cos(a) * R,
    y: C + Math.sin(a) * R,
    lx: C + Math.cos(a) * (R + 30),
    ly: C + Math.sin(a) * (R + 30),
  };
});
// a precision scale around the ring: 60 ticks, the long ones at the nodes
const TICKS = Array.from({ length: 60 }, (_, i) => {
  const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
  const major = i % 12 === 0;
  const r0 = R + 6;
  const r1 = R + (major ? 14 : 10);
  return { major, x1: C + Math.cos(a) * r0, y1: C + Math.sin(a) * r0, x2: C + Math.cos(a) * r1, y2: C + Math.sin(a) * r1 };
});

/** a composed statement: one phrase per line (or per phrase box), never broken inside */
function StatementLines({ statement, className }: { statement: Statement; className: string }) {
  // the space between phrases sits outside them: inside an inline-block it would collapse
  return statement.map((line, i) => (
    <Fragment key={line}>
      {i > 0 && " "}
      <span className={className}>{line}</span>
    </Fragment>
  ));
}

export default function AboutPage() {
  const divisions = [DIVISIONS.presence, DIVISIONS.aipe];
  return (
    <>
      <SiteHeader current="about" />
      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="about-title">
          <p className={styles.kicker}>ABOUT {COMPANY.name.toUpperCase()}</p>
          <h1 id="about-title" className={styles.title}>
            <StatementLines statement={COMPANY.tagline} className={styles.line} />
          </h1>
          <p className={styles.lead}>
            {COMPANY.name} connects people, intelligence, technology and the physical world. Its work
            runs in two directions: {DIVISIONS.presence.name}, the human interface to intelligent
            systems, and {DIVISIONS.aipe.name}, intelligent engineering for the energy and power systems
            that intelligence runs on.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="divisions-title">
          <p className={styles.kicker}>01 / STRUCTURE</p>
          <h2 id="divisions-title" className={styles.h2}>
            <span className={styles.phrase}>ONE COMPANY.</span> <span className={styles.phrase}>TWO DIRECTIONS.</span>
          </h2>
          <div className={styles.divisions}>
            {divisions.map((d, i) => (
              <Reveal key={d.id} className={styles.division} delay={i * 100}>
                <h3 className={styles.divisionName}>{d.name}</h3>
                <p className={styles.divisionRole}>{d.role}</p>
                {d.tagline && (
                  <p className={styles.divisionTagline}>
                    <StatementLines statement={d.tagline} className={styles.phrase} />
                  </p>
                )}
                <p className={styles.divisionSummary}>{d.summary}</p>
                <div className={styles.divisionLinks}>
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
                  {d.platformUrl && (
                    <a className={styles.quietLink} href={d.platformUrl} target="_blank" rel="noopener noreferrer">
                      {new URL(d.platformUrl).host} <span aria-hidden="true">↗</span>
                      <span className="sr-only"> (opens external site)</span>
                    </a>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="vision" className={styles.section} aria-labelledby="loop-title">
          <div className={styles.loop}>
            <Reveal className={styles.diagram}>
              <svg viewBox="0 0 400 400" role="img" aria-labelledby="loop-svg-title">
                {/* one string: <title> must have a single text child to render and hydrate */}
                <title id="loop-svg-title">{`The AIPE loop: ${VISION_LOOP.map((s) => s.label).join(", then ")}, and back to the start.`}</title>
                <g className={styles.scale}>
                  {TICKS.map((t, i) => (
                    <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} data-major={t.major || undefined} />
                  ))}
                </g>
                <circle className={styles.innerRing} cx={C} cy={C} r={R - 24} />
                <circle className={styles.ring} cx={C} cy={C} r={R} />
                <circle className={styles.ringFlow} cx={C} cy={C} r={R} pathLength={100} />
                {nodes.map((n, i) => (
                  <g key={n.id}>
                    <circle className={styles.nodeRing} cx={n.x} cy={n.y} r={9} />
                    <circle className={styles.node} cx={n.x} cy={n.y} r={3.5} />
                    <text className={styles.nodeIndex} x={n.lx} y={n.ly} textAnchor="middle" dominantBaseline="central">
                      0{i + 1}
                    </text>
                  </g>
                ))}
                <text className={styles.core} x={C} y={C - 4} textAnchor="middle">
                  AI ⇄ ENERGY
                </text>
                <text className={styles.coreSub} x={C} y={C + 18} textAnchor="middle">
                  SELF-IMPROVING LOOP
                </text>
              </svg>
            </Reveal>
            <div>
              <p className={styles.kicker}>02 / THE AIPE VISION</p>
              <h2 id="loop-title" className={styles.h2}>
                <StatementLines statement={AIPE_VISION} className={styles.line} />
              </h2>
              <p className={styles.loopLead}>
                At the centre of {DIVISIONS.aipe.name} is a self-improving loop between AI and energy.
                Energy systems power computation; AI learns those systems and designs better ones — and
                every improved system returns new data to the loop.
              </p>
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
              <div className={styles.divisionLinks}>
                <Link className={styles.textLink} href={DIVISIONS.aipe.href}>
                  Discover {DIVISIONS.aipe.name} <span aria-hidden="true">→</span>
                </Link>
                <Link className={styles.quietLink} href="/">
                  Experience the journey <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="news-title">
          <p className={styles.kicker}>03 / NEWS</p>
          <h2 id="news-title" className={styles.h2}>
            LATEST NEWS
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
