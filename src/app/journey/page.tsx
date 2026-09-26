import type { Metadata } from "next";
import JourneyExperience from "@/components/energyTown/JourneyExperience";

// alias of the homepage experience
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function JourneyPage() {
  return <JourneyExperience />;
}
