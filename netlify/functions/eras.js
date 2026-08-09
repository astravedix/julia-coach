// Era-level context: which Mahadasha/Antardasha "deep current" a date falls
// into, and what each vigilance level actually means within that era.
// Mirrors the "What Each Level Actually Means, Era by Era" section in the
// Berklee Years tab — kept here as structured data for the monthly digest.

const ERAS = [
  {
    name: "Rahu · Jupiter",
    start: "2025-02-20",
    end: "2027-07-14",
    theme: "Opportunity Attached to a Bigger Name",
    context: "A larger door is actively swinging open — the Fosse-legacy-shaped opportunity, arrival at Berklee itself.",
    levelMeanings: {
      flow: "Ease here is borrowed momentum from a door already opening, not just a private good mood.",
      gentle: "The watch-point is visibility and exposure before she's fully ready for the spotlight, not mood for its own sake.",
      high: "Friction and scatter land while a genuine opportunity is live — losing focus risks the actual door, not just a bad week.",
      heaviest: "A rare heavy stretch inside an otherwise opening era — treat it as a short toll, not the new normal.",
    },
  },
  {
    name: "Rahu · Saturn",
    start: "2027-07-14",
    end: "2030-05-20",
    theme: "Long-Haul Mastery",
    context: "The door already opened; this era is about whether the craft holds up under sustained weight — proving, not arriving.",
    levelMeanings: {
      flow: "Reads as relief and recovery after grind, not a fresh opening — closer to exhaling than a new door.",
      gentle: "Risk is losing motivation quietly mid-marathon, not losing an opportunity.",
      high: "About whether she keeps training when nothing new is being offered — the temptation is to quit the grind, not to miss an invitation.",
      heaviest: "The single heaviest stretch in her whole four years — a doubled Saturn signature. Real mastery consolidates here if she holds steady.",
    },
  },
  {
    name: "Rahu · Mercury",
    start: "2030-05-20",
    end: "2033-01-02",
    theme: "Her Own Signature",
    context: "Mercury rules both her Ascendant and Moon — this era is where flow stops meaning relief or borrowed momentum and starts meaning something self-authored.",
    levelMeanings: {
      flow: "This is close to her most natural, unforced state — craft built through the Saturn years, now hers to use on her own terms.",
      gentle: "Even the lighter watch-points here tend to be about her own standards, not external pressure.",
      high: "Friction in this era is more likely creative tension than external obstacle — still worth pacing herself through.",
      heaviest: "Not mapped in her Berklee years — this era hasn't shown a heaviest-test stretch yet.",
    },
  },
];

function getEraForDate(date = new Date()) {
  const iso = date.toISOString().slice(0, 10);
  return ERAS.find((e) => iso >= e.start && iso < e.end) || null;
}

// Rough Berklee year number for a given date, anchored to a Fall start.
function getBerkleeYear(date = new Date()) {
  const start = new Date("2026-08-24");
  if (date < start) return 0; // not started yet
  const months = (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());
  const year = Math.floor(months / 12) + 1;
  return year > 4 ? "post-graduation" : year;
}

module.exports = { ERAS, getEraForDate, getBerkleeYear };
