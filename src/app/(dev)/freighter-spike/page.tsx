import { notFound } from "next/navigation";
import { FreighterSpike } from "./FreighterSpike";

// C-02(a) / HO-03 spike, dev branch only (never merged to main). Not served in
// production builds.
export default function FreighterSpikePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <FreighterSpike />;
}
