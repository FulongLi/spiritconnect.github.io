import { Fragment } from "react";
import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";
import Footer from "@/components/overlay/components/Footer/Footer";
import { Reveal } from "@/components/presence/PageEffects";
import { assetPath } from "@/components/shared/assetPath";
import { AIPE_ENTER, AIPE_HERO, AIPE_HERO_IMAGE, AIPE_INTELLIGENCE, AIPE_PLATFORM } from "@/content/aipe";
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

const hero = (file: string) => assetPath(`/aipe/${file}`);
const srcSet = (shot: string, widths: number[], ext: "avif" | "webp") =>
  widths.map((w) => `${hero(`hero-${shot}-${w}.${ext}`)} ${w}w`).join(", ");

/**
 * The lunar micro-grid still, art-directed per aspect: a portrait
 * composition for phones and portrait tablets, a 16:10 one for laptops
 * and landscape tablets, a 2:1 one from 16:9 up. Each is composed with
 * the system on one side and dark sky for the type on the other.
 */
function HeroImage() {
  const shots = [
    { shot: "portrait", widths: [750, 1170, 1620], media: "(orientation: portrait)" },
    { shot: "standard", widths: [1440, 2880], media: "(max-aspect-ratio: 16/9)" },
    { shot: "wide", widths: [1920, 2560, 3840] },
  ];
  return (
    <picture>
      {shots.flatMap(({ shot, widths, media }) =>
        (["avif", "webp"] as const).map((ext) => (
          <source
            key={`${shot}-${ext}`}
            type={`image/${ext}`}
            media={media}
            srcSet={srcSet(shot, widths, ext)}
            sizes="100vw"
          />
        )),
      )}
      <img
        className={styles.heroImage}
        src={hero("hero-wide-1920.jpg")}
        alt={AIPE_HERO_IMAGE.alt}
        width={3840}
        height={1920}
        fetchPriority="high"
        decoding="async"
      />
    </picture>
  );
}

export default function AipePage() {
  return (
    <>
      <SiteHeader current="aipe" />
      <main className={styles.page}>
        {/* ── 01 Vision ──────────────────────────────────────────────────── */}
        <section className={styles.hero} aria-labelledby="aipe-title">
          <div className={styles.heroMedia}>
            <HeroImage />
          </div>
          <div className={styles.heroInner}>
            <p className={styles.eyebrow}>{AIPE_HERO.eyebrow}</p>
            <h1 id="aipe-title" className={styles.title}>
              {AIPE_HERO.title}
              <span className="sr-only"> — {statementText(AIPE_HERO.statement)}</span>
            </h1>
            <p className={styles.statement} aria-hidden="true">
              <Lines statement={AIPE_HERO.statement} />
            </p>
            <p className={styles.tagline}>{AIPE_HERO.tagline}</p>
            <p className={styles.lead}>{AIPE_HERO.body}</p>
            <div className={styles.actions}>
              <PlatformLink />
            </div>
            <PlatformHost />
          </div>
          <p className={styles.caption} aria-hidden="true">
            {AIPE_HERO_IMAGE.caption}
          </p>
        </section>

        {/* ── 02 Engineering intelligence ────────────────────────────────── */}
        <section id="intelligence" className={styles.section} aria-labelledby="intelligence-title">
          <div className={styles.split}>
            <Reveal>
              <p className={styles.kicker}>{AIPE_INTELLIGENCE.kicker}</p>
              <h2 id="intelligence-title" className={styles.h2}>
                <Lines statement={AIPE_INTELLIGENCE.title} />
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className={styles.body}>{AIPE_INTELLIGENCE.body}</p>
            </Reveal>
          </div>

          <ol className={styles.scales} aria-label="Engineering scales">
            {AIPE_INTELLIGENCE.scales.map((s, i) => (
              <Reveal as="li" key={s.id} className={styles.scale} delay={i * 90}>
                <span className={styles.index}>0{i + 1}</span>
                <h3 className={styles.scaleLabel}>{s.label}</h3>
                <p className={styles.scaleDetail}>{s.detail}</p>
              </Reveal>
            ))}
          </ol>

          <Reveal className={styles.workflow}>
            <p className={styles.index}>{AIPE_INTELLIGENCE.workflowLabel}</p>
            <ol className={styles.flow} aria-label={AIPE_INTELLIGENCE.workflowLabel}>
              {AIPE_INTELLIGENCE.workflow.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </Reveal>
        </section>

        {/* ── 03 Enter AIPE ──────────────────────────────────────────────── */}
        <section className={styles.enter} aria-labelledby="enter-title">
          {/* the Moon's limb, as in the journey's opening shot */}
          <div className={styles.limb} aria-hidden="true" />
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
