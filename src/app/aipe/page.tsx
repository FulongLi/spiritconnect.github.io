import { Fragment } from "react";
import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";
import Footer from "@/components/overlay/components/Footer/Footer";
import { Reveal } from "@/components/presence/PageEffects";
import { AIPE_ENTER, AIPE_HERO, AIPE_IDEA, AIPE_PLATFORM, AIPE_SCOPE } from "@/content/aipe";
import { statementText, type Statement } from "@/content/site";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "AIPE — Energy powers AI. AI designs energy.",
  description: AIPE_HERO.body,
  alternates: { canonical: "/aipe" },
};

/** a composed statement: one phrase per line, never broken inside */
function Lines({ statement }: { statement: Statement }) {
  return statement.map((line, i) => (
    <Fragment key={line}>
      {i > 0 && " "}
      <span className={styles.line}>{line}</span>
    </Fragment>
  ));
}

/** the way into the standalone platform — clearly marked as another website */
function PlatformLink() {
  return (
    <a className={styles.primaryButton} href={AIPE_PLATFORM.url} target="_blank" rel="noopener noreferrer">
      {AIPE_PLATFORM.cta} <span aria-hidden="true">↗</span>
      <span className="sr-only"> (opens {AIPE_PLATFORM.host} in a new tab)</span>
    </a>
  );
}

/** the visible hint under a platform link (announced by the link itself) */
function PlatformHost() {
  return (
    <p className={styles.host} aria-hidden="true">
      {AIPE_PLATFORM.host} · opens another website
    </p>
  );
}

export default function AipePage() {
  return (
    <>
      <SiteHeader current="aipe" />
      <main className={styles.page}>
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className={styles.hero} aria-labelledby="aipe-title">
          <div className={styles.heroGrid} aria-hidden="true" />
          <p className={styles.eyebrow}>{AIPE_HERO.eyebrow}</p>
          <h1 id="aipe-title" className={styles.title}>
            {AIPE_HERO.title}
            <span className="sr-only"> — {statementText(AIPE_HERO.statement)}</span>
          </h1>
          <p className={styles.statement} aria-hidden="true">
            <Lines statement={AIPE_HERO.statement} />
          </p>
          <p className={styles.lead}>{AIPE_HERO.body}</p>
          <div className={styles.actions}>
            <PlatformLink />
            <a className={styles.textLink} href="#vision">
              {AIPE_HERO.secondaryCta} <span aria-hidden="true">↓</span>
            </a>
          </div>
          <PlatformHost />
        </section>

        {/* ── The idea: the energy–AI feedback loop ──────────────────────── */}
        <section id="vision" className={styles.section} aria-labelledby="idea-title">
          <div className={styles.split}>
            <Reveal>
              <p className={styles.kicker}>{AIPE_IDEA.kicker}</p>
              <h2 id="idea-title" className={styles.h2}>
                <Lines statement={AIPE_IDEA.title} />
              </h2>
            </Reveal>
            <Reveal delay={100}>
              {AIPE_IDEA.body.map((p) => (
                <p key={p} className={styles.body}>
                  {p}
                </p>
              ))}
              <ol className={styles.loop} aria-label="The loop">
                {AIPE_IDEA.steps.map((step, i) => (
                  <li key={step}>
                    <span className={styles.index}>0{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </section>

        {/* ── From devices to systems ─────────────────────────────────────── */}
        <section className={styles.section} aria-labelledby="scope-title">
          <Reveal>
            <p className={styles.kicker}>{AIPE_SCOPE.kicker}</p>
            <h2 id="scope-title" className={styles.h2}>
              <Lines statement={AIPE_SCOPE.title} />
            </h2>
          </Reveal>
          <ol className={styles.scales}>
            {AIPE_SCOPE.scales.map((s, i) => (
              <Reveal as="li" key={s.id} className={styles.scale} delay={i * 90}>
                <span className={styles.index}>0{i + 1}</span>
                <h3 className={styles.scaleLabel}>{s.label}</h3>
                <p className={styles.scaleDetail}>{s.detail}</p>
              </Reveal>
            ))}
          </ol>
          <p className={styles.workflow}>{AIPE_SCOPE.workflow}</p>
        </section>

        {/* ── Enter the platform ─────────────────────────────────────────── */}
        <section className={`${styles.section} ${styles.enter}`} aria-labelledby="enter-title">
          <Reveal className={styles.enterInner}>
            <p className={styles.kicker}>{AIPE_ENTER.kicker}</p>
            <h2 id="enter-title" className={styles.h2}>
              <Lines statement={AIPE_ENTER.title} />
            </h2>
            <p className={styles.body}>{AIPE_ENTER.body}</p>
            <PlatformLink />
            <PlatformHost />
          </Reveal>
        </section>
      </main>
      <Footer variant="page" />
    </>
  );
}
