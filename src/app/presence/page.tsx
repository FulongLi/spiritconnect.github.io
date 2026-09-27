import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";
import Footer from "@/components/overlay/components/Footer/Footer";
import MediaSlot from "@/components/presence/MediaSlot";
import InterestForm from "@/components/presence/InterestForm";
import FutureAction from "@/components/presence/FutureAction";
import { Reveal, WatchDemoLink } from "@/components/presence/PageEffects";
import {
  INTEREST_FORM_COPY,
  PRESENCE_FOUNDING,
  PRESENCE_HARDWARE,
  PRESENCE_HERO,
  PRESENCE_IN_ACTION,
  PRESENCE_INTRO,
  PRESENCE_MEDIA,
  PRESENCE_PREORDER,
  PRESENCE_USE_CASES,
} from "@/content/presence";
import { FOUNDING_PRICE_LABEL, PRESENCE_PRICING, PRESENCE_RELEASE } from "@/content/pricing";
import { DIVISIONS } from "@/content/site";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Presence — AI, with a presence",
  description: `Presence is a visual + voice interface for AI, with dedicated Presence hardware now in its pre-order phase. Founding 100: the first ${PRESENCE_PRICING.foundingAllocation} units at ${FOUNDING_PRICE_LABEL}, launch planned for ${PRESENCE_RELEASE.plannedLaunch}.`,
  alternates: { canonical: "/presence" },
};

export default function PresencePage() {
  return (
    <>
      <SiteHeader current="presence" />
      <main className={styles.page}>
        {/* ── Hero: the app animation is the dominant element. The video is
            rendered on pure black like the page, so it dissolves into the
            environment instead of sitting in a player frame. ──────────── */}
        <section className={styles.hero} aria-labelledby="presence-title">
          <div className={styles.heroHaze} aria-hidden="true" />
          <div className={styles.heroHeading}>
            <p className={styles.eyebrow}>{PRESENCE_HERO.eyebrow}</p>
            <h1 id="presence-title" className={styles.heroTitle}>
              {PRESENCE_HERO.title}
            </h1>
            <p className={styles.heroTagline}>{PRESENCE_HERO.tagline}</p>
          </div>
          <div className={styles.heroMedia}>
            <MediaSlot
              config={PRESENCE_MEDIA.heroAnimation}
              variant="ambient"
              className={styles.heroSlot}
              priority
            />
          </div>
          <div className={styles.heroActions}>
            <WatchDemoLink
              href="#demo"
              slotId={PRESENCE_MEDIA.demoVideo.id}
              className={styles.primaryButton}
            >
              <span className={styles.playGlyph} aria-hidden="true" />
              {PRESENCE_HERO.primaryCta}
            </WatchDemoLink>
            <a href="#register" className={styles.ghostButton}>
              {PRESENCE_HERO.secondaryCta}
            </a>
          </div>
        </section>

        {/* ── What is Presence ──────────────────────────────────────────────── */}
        <section className={styles.section} aria-labelledby="what-title">
          <Reveal className={styles.split}>
            <div>
              <p className={styles.kicker}>{PRESENCE_INTRO.kicker}</p>
              <h2 id="what-title" className={styles.h2}>
                {PRESENCE_INTRO.title}
              </h2>
            </div>
            <p className={styles.lead}>{PRESENCE_INTRO.body}</p>
          </Reveal>
          <ul className={styles.pillars}>
            {PRESENCE_INTRO.pillars.map((pillar, i) => (
              <Reveal as="li" key={pillar.title} className={styles.pillar} delay={i * 90}>
                <span className={styles.pillarIndex}>0{i + 1}</span>
                <h3 className={styles.pillarTitle}>{pillar.title}</h3>
                <p className={styles.pillarBody}>{pillar.body}</p>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* ── Presence in action ────────────────────────────────────────────── */}
        <section id="demo" className={styles.section} aria-labelledby="demo-title">
          <Reveal className={styles.centered}>
            <p className={styles.kicker}>{PRESENCE_IN_ACTION.kicker}</p>
            <h2 id="demo-title" className={styles.h2}>
              {PRESENCE_IN_ACTION.title}
            </h2>
          </Reveal>
          <Reveal className={styles.demoMedia}>
            <MediaSlot config={PRESENCE_MEDIA.demoVideo} />
            <p className={styles.caption}>{PRESENCE_IN_ACTION.caption}</p>
          </Reveal>
          {/* watch it → try it: the live online experience, once it is deployed */}
          <Reveal className={styles.tryAction}>
            <FutureAction
              id="try-presence"
              href={PRESENCE_RELEASE.experienceUrl}
              className={styles.primaryButton}
              pendingNote={PRESENCE_IN_ACTION.tryPending}
            >
              {PRESENCE_IN_ACTION.tryCta}
            </FutureAction>
          </Reveal>
        </section>

        {/* ── Work + Everyday ───────────────────────────────────────────────── */}
        <section className={styles.section} aria-labelledby="uses-title">
          <Reveal className={styles.centered}>
            <p className={styles.kicker}>{PRESENCE_USE_CASES.kicker}</p>
            <h2 id="uses-title" className={styles.h2}>
              {PRESENCE_USE_CASES.title}
            </h2>
          </Reveal>
          <div className={styles.useGrid}>
            {PRESENCE_USE_CASES.columns.map((col, i) => (
              <Reveal key={col.id} className={styles.useCard} delay={i * 120}>
                <h3 className={styles.useLabel}>{col.label}</h3>
                <ul className={styles.useList}>
                  {col.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
          <p className={styles.useNote}>
            {PRESENCE_USE_CASES.note}{" "}
            <a href={DIVISIONS.aipe.href} target="_blank" rel="noopener noreferrer">
              Explore AIPE <span aria-hidden="true">↗</span>
              <span className="sr-only"> (opens external site)</span>
            </a>
          </p>
        </section>

        {/* ── Presence hardware ─────────────────────────────────────────────── */}
        <section className={styles.section} aria-labelledby="hardware-title">
          <div className={styles.hardware}>
            <Reveal className={styles.hardwareMedia}>
              <MediaSlot config={PRESENCE_MEDIA.hardwareConcept} />
            </Reveal>
            <Reveal className={styles.hardwareCopy} delay={100}>
              <p className={styles.kicker}>{PRESENCE_HARDWARE.kicker}</p>
              <h2 id="hardware-title" className={styles.h2}>
                {PRESENCE_HARDWARE.title}
              </h2>
              <p className={styles.lead}>{PRESENCE_HARDWARE.body}</p>
              <p className={styles.status}>{PRESENCE_HARDWARE.status}</p>
              <p className={styles.progress}>{PRESENCE_HARDWARE.progress}</p>
              <h3 className={styles.capabilitiesTitle}>{PRESENCE_HARDWARE.capabilitiesTitle}</h3>
              <ul className={styles.capabilities}>
                {PRESENCE_HARDWARE.capabilities.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p className={styles.disclaimer}>{PRESENCE_HARDWARE.disclaimer}</p>
            </Reveal>
          </div>
        </section>

        {/* ── Founding 100 ──────────────────────────────────────────────────── */}
        <section id="founding" className={styles.founding} aria-labelledby="founding-title">
          <div className={styles.foundingHaze} aria-hidden="true" />
          <Reveal className={styles.foundingInner}>
            <h2 id="founding-title" className={styles.foundingKicker}>
              {PRESENCE_FOUNDING.kicker}
            </h2>
            <p className={styles.price}>{PRESENCE_FOUNDING.priceLabel}</p>
            <p className={styles.allocation}>{PRESENCE_FOUNDING.allocationLine}</p>
            <div className={styles.units} aria-hidden="true">
              {Array.from({ length: PRESENCE_PRICING.foundingAllocation }, (_, i) => (
                <span key={i} style={{ "--d": `${(i % 10) * 40 + Math.floor(i / 10) * 40}ms` } as React.CSSProperties} />
              ))}
            </div>
            <p className={styles.foundingBody}>{PRESENCE_FOUNDING.body}</p>
            <dl className={styles.foundingFacts}>
              {PRESENCE_FOUNDING.facts.map((f) => (
                <div key={f.label}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
            {/* buy it, or stay close: two clearly different commitments */}
            <div className={styles.foundingActions}>
              <FutureAction
                id="founding-preorder"
                href={PRESENCE_RELEASE.preorderUrl}
                className={styles.primaryButton}
                pendingNote={PRESENCE_PREORDER.pending}
              >
                {PRESENCE_FOUNDING.preorderCta}
              </FutureAction>
              <a href="#register" className={styles.ghostButton}>
                {PRESENCE_FOUNDING.interestCta}
              </a>
            </div>
            <p className={styles.finePrint}>{PRESENCE_FOUNDING.finePrint}</p>
          </Reveal>
        </section>

        {/* ── Pre-order or register interest: the two states, side by side ──── */}
        <div className={`${styles.section} ${styles.convert}`}>
          <section id="preorder" className={styles.convertPreorder} aria-labelledby="preorder-title">
            <Reveal>
              <p className={styles.kicker}>{PRESENCE_PREORDER.kicker}</p>
              <h2 id="preorder-title" className={styles.h2}>
                {PRESENCE_PREORDER.title}
              </h2>
              <p className={styles.convertPrice}>
                <span>{PRESENCE_PREORDER.priceCaption}</span>
                <strong>{PRESENCE_PREORDER.priceLabel}</strong>
                <span>{PRESENCE_PREORDER.releaseLine}</span>
                <span>{PRESENCE_PREORDER.retailLine}</span>
              </p>
              <FutureAction
                id="convert-preorder"
                href={PRESENCE_RELEASE.preorderUrl}
                className={styles.primaryButton}
                pendingNote={PRESENCE_PREORDER.pending}
                align="start"
              >
                {PRESENCE_PREORDER.cta}
              </FutureAction>
            </Reveal>
          </section>
          {/* #register: the hero and Founding 100 "register" links land here */}
          <section id="register" className={styles.convertInterest} aria-labelledby="register-title">
            <Reveal delay={100}>
              <p className={styles.kicker}>{INTEREST_FORM_COPY.kicker}</p>
              <h2 id="register-title" className={styles.h2}>
                {INTEREST_FORM_COPY.title}
              </h2>
              <p className={styles.lead}>{INTEREST_FORM_COPY.body}</p>
              <div className={styles.registerForm}>
                <InterestForm />
              </div>
            </Reveal>
          </section>
        </div>
      </main>
      <Footer variant="page" />
    </>
  );
}
