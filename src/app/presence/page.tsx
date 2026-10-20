import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import Footer from "@/components/overlay/components/Footer/Footer";
import MediaSlot from "@/components/presence/MediaSlot";
import InterestForm from "@/components/presence/InterestForm";
import FutureAction from "@/components/presence/FutureAction";
import CampaignProgress from "@/components/presence/CampaignProgress";
import { Reveal, WatchDemoLink } from "@/components/presence/PageEffects";
import {
  INTEREST_FORM_COPY,
  PRESENCE_BACKING,
  PRESENCE_FOUNDING,
  PRESENCE_HARDWARE,
  PRESENCE_HERO,
  PRESENCE_IN_ACTION,
  PRESENCE_INTRO,
  PRESENCE_MEDIA,
  PRESENCE_USE_CASES,
} from "@/content/presence";
import { CAMPAIGN_FIGURES, backingUrl } from "@/content/campaign";
import { PRESENCE_RELEASE } from "@/content/pricing";
import { DIVISIONS } from "@/content/site";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Presence — AI, with a presence",
  description: `Presence is a visual + voice interface for AI. Founding ${CAMPAIGN_FIGURES.targetLabel}: when ${CAMPAIGN_FIGURES.targetLabel} people commit to Presence Hardware at ${CAMPAIGN_FIGURES.priceLabel}, we move toward production — first release planned for ${CAMPAIGN_FIGURES.plannedLaunch}, conditional on the campaign.`,
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
            <Link href={DIVISIONS.aipe.href}>
              Discover AIPE <span aria-hidden="true">→</span>
            </Link>
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

        {/* ── Founding 1,000: the conditional hardware launch campaign ────────── */}
        <section id="founding" className={styles.founding} aria-labelledby="founding-title">
          <div className={styles.foundingHaze} aria-hidden="true" />
          <Reveal className={styles.foundingInner}>
            <p className={styles.foundingKicker}>{PRESENCE_FOUNDING.kicker}</p>
            <h2 id="founding-title" className={styles.foundingTitle}>
              {PRESENCE_FOUNDING.title}
            </h2>
            <p className={styles.price}>{PRESENCE_FOUNDING.priceLabel}</p>
            <p className={styles.foundingStatement}>
              {/* one phrase per line; the leading space (collapsed at the line start) keeps the text whole */}
              {PRESENCE_FOUNDING.statement.map((line, i) => (
                <span key={line}>
                  {i > 0 && " "}
                  {line}
                </span>
              ))}
            </p>
            <p className={styles.foundingBody}>{PRESENCE_FOUNDING.body}</p>
            <dl className={styles.foundingFacts}>
              {PRESENCE_FOUNDING.facts.map((f) => (
                <div key={f.label}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
            <div className={styles.foundingProgress}>
              <CampaignProgress />
            </div>
            {/* back it, or stay close: two clearly different commitments */}
            <div className={styles.foundingActions}>
              <FutureAction
                id="founding-back"
                href={backingUrl()}
                className={styles.primaryButton}
                pendingNote={PRESENCE_BACKING.pending}
              >
                {PRESENCE_FOUNDING.backCta}
              </FutureAction>
              <a href="#register" className={styles.ghostButton}>
                {PRESENCE_FOUNDING.interestCta}
              </a>
            </div>
            <div className={styles.finePrint}>
              {PRESENCE_FOUNDING.finePrint.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ── Back Presence or register interest: two different actions ────── */}
        <div className={`${styles.section} ${styles.convert}`}>
          <section id="back" className={styles.convertBack} aria-labelledby="back-title">
            <Reveal>
              <p className={styles.kicker}>{PRESENCE_BACKING.kicker}</p>
              <h2 id="back-title" className={styles.h2}>
                {PRESENCE_BACKING.title}
              </h2>
              <p className={styles.convertPrice}>
                <span>{PRESENCE_BACKING.priceCaption}</span>
                <strong>{PRESENCE_BACKING.priceLabel}</strong>
                {PRESENCE_BACKING.lines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </p>
              <FutureAction
                id="convert-back"
                href={backingUrl()}
                className={styles.primaryButton}
                pendingNote={PRESENCE_BACKING.pending}
                align="start"
              >
                {PRESENCE_BACKING.cta}
              </FutureAction>
              <h3 className={styles.beforeTitle}>{PRESENCE_BACKING.beforeTitle}</h3>
              <ul className={styles.beforeList}>
                {PRESENCE_BACKING.before.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className={styles.disclaimer}>{PRESENCE_BACKING.noPayment}</p>
            </Reveal>
          </section>
          {/* #register: the hero and Founding 1,000 "register" links land here */}
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
