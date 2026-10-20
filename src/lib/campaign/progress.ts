import { FOUNDING_CAMPAIGN } from "@/content/campaign";

/* ------------------------------------------------------------------ */
/* Founding 1,000 — campaign progress                                   */
/*                                                                     */
/* The official count is the number of QUALIFYING, CONFIRMED            */
/* commitments made through the approved campaign checkout. It is       */
/* decided by the payment / campaign provider, never by this site:      */
/*                                                                     */
/*   counted      confirmed commitments under the published terms      */
/*   not counted  Register Interest sign-ups, test-mode payments,       */
/*                failed or abandoned payments, cancellations, refunds  */
/*                                                                     */
/* The site only displays a number an authoritative source reports.     */
/* While the campaign is in pre-launch, no source is read and the UI    */
/* shows the target and an explanatory state — never a made-up count.   */
/*                                                                     */
/*   NEXT_PUBLIC_CAMPAIGN_PROGRESS_ENDPOINT=https://…                   */
/*     → GET, expecting CampaignProgressPayload (below). Read in the    */
/*       browser once the campaign phase is no longer "pre-launch".     */
/*                                                                     */
/* For another integration, implement CampaignProgressSource and return */
/* it from `getProgressSource`.                                         */
/* ------------------------------------------------------------------ */

export type CampaignProgress =
  /** the campaign has not opened: show the target, no count */
  | { status: "pre-launch" }
  /** the campaign is open but no authoritative count could be read */
  | { status: "unavailable" }
  /** an authoritative count of confirmed commitments */
  | { status: "live"; confirmed: number; target: number; asOf: string };

/** The JSON an authoritative progress endpoint returns. */
export type CampaignProgressPayload = {
  campaign: typeof FOUNDING_CAMPAIGN.id;
  /** qualifying, confirmed commitments only (see the counting rules above) */
  confirmedCommitments: number;
  /** when the count was taken, ISO 8601 */
  asOf: string;
};

export interface CampaignProgressSource {
  readonly name: string;
  read(): Promise<CampaignProgress>;
}

const ENDPOINT = process.env.NEXT_PUBLIC_CAMPAIGN_PROGRESS_ENDPOINT?.trim() || "";

function parsePayload(data: unknown): CampaignProgress {
  if (!data || typeof data !== "object") return { status: "unavailable" };
  const p = data as Partial<CampaignProgressPayload>;
  const n = p.confirmedCommitments;
  const valid =
    p.campaign === FOUNDING_CAMPAIGN.id &&
    typeof n === "number" &&
    Number.isInteger(n) &&
    n >= 0 &&
    typeof p.asOf === "string" &&
    !Number.isNaN(Date.parse(p.asOf));
  if (!valid) return { status: "unavailable" };
  return { status: "live", confirmed: n, target: FOUNDING_CAMPAIGN.target, asOf: p.asOf! };
}

export function httpProgressSource(endpoint: string): CampaignProgressSource {
  return {
    name: "http-json",
    async read() {
      try {
        const res = await fetch(endpoint, { headers: { Accept: "application/json" }, cache: "no-store" });
        if (!res.ok) return { status: "unavailable" };
        return parsePayload(await res.json());
      } catch {
        return { status: "unavailable" };
      }
    },
  };
}

const staticSource = (progress: CampaignProgress, name: string): CampaignProgressSource => ({
  name,
  async read() {
    return progress;
  },
});

export function getProgressSource(): CampaignProgressSource {
  if (FOUNDING_CAMPAIGN.phase === "pre-launch") return staticSource({ status: "pre-launch" }, "pre-launch");
  return ENDPOINT ? httpProgressSource(ENDPOINT) : staticSource({ status: "unavailable" }, "not-configured");
}

/** the state rendered before (or without) a read: the static export's HTML */
export function initialProgress(): CampaignProgress {
  return FOUNDING_CAMPAIGN.phase === "pre-launch" ? { status: "pre-launch" } : { status: "unavailable" };
}
