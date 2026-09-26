"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import {
  INTEREST_FORM_COPY as COPY,
  INTEREST_LEVELS,
  PRIMARY_USES,
  PURCHASE_INTENTS,
} from "@/content/presence";
import { COMPANY } from "@/content/site";
import { submitInterest } from "@/lib/interest/submitInterest";
import { validateInterest, type InterestDraft, type InterestErrors } from "@/lib/interest/validate";
import type { InterestFormValues } from "@/lib/interest/types";
import styles from "./InterestForm.module.css";

type Status = "idle" | "submitting" | "success" | "not-configured" | "error";

const EMPTY: InterestDraft = {
  email: "",
  interestLevel: "",
  primaryUse: "",
  purchaseIntent: "",
  consent: false,
};

const FIELD_ORDER: (keyof InterestFormValues)[] = [
  "email",
  "interestLevel",
  "primaryUse",
  "purchaseIntent",
  "consent",
];

type Option = { value: string; label: string };

function ChoiceGroup({
  name,
  legend,
  options,
  value,
  error,
  onChange,
}: {
  name: keyof InterestFormValues;
  legend: string;
  options: readonly Option[];
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const errorId = useId();
  return (
    <fieldset
      className={styles.fieldset}
      aria-invalid={!!error}
      aria-describedby={error ? errorId : undefined}
      data-field={name}
    >
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.choices}>
        {options.map((o) => (
          <label key={o.value} className={styles.choice}>
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </fieldset>
  );
}

/**
 * Founding 100 market-validation form. Submission goes through
 * `submitInterest` (src/lib/interest) — no payment, no fake success.
 */
export default function InterestForm() {
  const [draft, setDraft] = useState<InterestDraft>(EMPTY);
  const [errors, setErrors] = useState<InterestErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [honeypot, setHoneypot] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const emailErrorId = useId();
  const consentErrorId = useId();

  const set = <K extends keyof InterestDraft>(key: K, value: InterestDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const focusFirstError = (errs: InterestErrors) => {
    const first = FIELD_ORDER.find((k) => errs[k]);
    if (!first || !formRef.current) return;
    const el = formRef.current.querySelector<HTMLInputElement>(`[name="${first}"]`);
    el?.focus();
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === "submitting") return;
    const { values, errors: errs } = validateInterest(draft);
    setErrors(errs);
    if (!values) {
      focusFirstError(errs);
      return;
    }
    setStatus("submitting");
    // bots fill hidden fields; quietly drop those submissions
    const result = honeypot ? ({ ok: true } as const) : await submitInterest(values);
    const next: Status = result.ok ? "success" : result.reason === "not-configured" ? "not-configured" : "error";
    setStatus(next);
    requestAnimationFrame(() => statusRef.current?.focus());
  };

  if (status === "success" || status === "not-configured" || status === "error") {
    const message =
      status === "success" ? COPY.success : status === "not-configured" ? COPY.notConfigured : COPY.error;
    return (
      <div
        ref={statusRef}
        className={styles.result}
        data-status={status}
        role="status"
        tabIndex={-1}
      >
        <p className={styles.resultTitle}>{message.title}</p>
        <p className={styles.resultBody}>{message.body}</p>
        {status === "not-configured" && COMPANY.contactEmail && (
          <p className={styles.resultBody}>
            You can also write to us at{" "}
            <a href={`mailto:${COMPANY.contactEmail}?subject=Presence%20Founding%20100`}>
              {COMPANY.contactEmail}
            </a>
            .
          </p>
        )}
        {status !== "success" && (
          <button type="button" className={styles.secondaryButton} onClick={() => setStatus("idle")}>
            Back to the form
          </button>
        )}
      </div>
    );
  }

  return (
    <form ref={formRef} className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.field} data-field="email">
        <label className={styles.legend} htmlFor="interest-email">
          Email
        </label>
        <input
          id="interest-email"
          className={styles.input}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={draft.email as string}
          onChange={(e) => set("email", e.target.value)}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? emailErrorId : undefined}
          required
        />
        {errors.email && (
          <p id={emailErrorId} className={styles.error}>
            {errors.email}
          </p>
        )}
      </div>

      <ChoiceGroup
        name="interestLevel"
        legend="Interest level"
        options={INTEREST_LEVELS}
        value={draft.interestLevel as string}
        error={errors.interestLevel}
        onChange={(v) => set("interestLevel", v as InterestDraft["interestLevel"])}
      />

      <ChoiceGroup
        name="primaryUse"
        legend="Primary use"
        options={PRIMARY_USES}
        value={draft.primaryUse as string}
        error={errors.primaryUse}
        onChange={(v) => set("primaryUse", v as InterestDraft["primaryUse"])}
      />

      <ChoiceGroup
        name="purchaseIntent"
        legend={COPY.purchaseQuestion}
        options={PURCHASE_INTENTS}
        value={draft.purchaseIntent as string}
        error={errors.purchaseIntent}
        onChange={(v) => set("purchaseIntent", v as InterestDraft["purchaseIntent"])}
      />

      {/* spam trap — hidden from people and assistive technology */}
      <div className={styles.trap} aria-hidden="true">
        <label>
          Company
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>
      </div>

      <div className={styles.field} data-field="consent">
        <label className={styles.consent}>
          <input
            type="checkbox"
            name="consent"
            checked={draft.consent as boolean}
            onChange={(e) => set("consent", e.target.checked)}
            aria-invalid={!!errors.consent}
            aria-describedby={errors.consent ? consentErrorId : undefined}
          />
          <span>{COPY.consentLabel}</span>
        </label>
        {errors.consent && (
          <p id={consentErrorId} className={styles.error}>
            {errors.consent}
          </p>
        )}
      </div>

      <button className={styles.submit} type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : COPY.submit}
        <span aria-hidden="true">→</span>
      </button>
      <p className={styles.note}>No payment is taken. Registering interest does not commit you to buy.</p>
    </form>
  );
}
