// Shared source of truth for her sub-period vigilance map.
// Used by: the in-app "Current Outlook" banner (duplicated client-side in
// index.html) and the weekly email digest function. Keep both in sync if
// you ever edit these dates — this file is the canonical version.

const PERIODS = [
  { planet: "Venus",   start: "2026-04-24", end: "2026-09-18", level: "flow",     label: "Flow",
    desc: "Harmony and grace come easily — social ease, aesthetic pleasure, and relationships flow with little resistance. Good window to build a habit while it costs little effort to maintain." },
  { planet: "Sun",     start: "2026-09-18", end: "2026-11-02", level: "gentle",   label: "Gentle vigilance",
    desc: "Visibility and ego exposure rise — more attention, more recognition. Watch for pride or overextending to be seen, not a discipline risk." },
  { planet: "Moon",    start: "2026-11-02", end: "2027-01-14", level: "gentle",   label: "Gentle vigilance",
    desc: "Her own natural Moon strength gets amplified — emotional sensitivity and intuition both run high. Good for artistry, needs a conscious hand so mood doesn't quietly steer the routine." },
  { planet: "Mars",    start: "2027-01-14", end: "2027-03-04", level: "high",     label: "High vigilance",
    desc: "Friction, impulsiveness, short temper, real injury risk in physical training. Pace matters more than usual; conflicts are easier to spark than to walk back." },
  { planet: "Rahu",    start: "2027-03-04", end: "2027-07-14", level: "high",     label: "High vigilance",
    desc: "Restlessness and a pull toward whatever looks shinier than the current plan. The longest single risk stretch in year one — scatter and follow-through, not intensity, is the challenge." },
  { planet: "Saturn",  start: "2027-07-14", end: "2027-12-26", level: "heaviest", label: "Heaviest test",
    desc: "Slow results, real fatigue, a genuine test of showing up when nothing feels like it's paying off yet. Not punishing — proving. Holding steady here is what mastery is built from." },
  { planet: "Mercury", start: "2027-12-26", end: "2028-05-21", level: "flow",     label: "Flow",
    desc: "Her own chart ruler active — mental clarity, precision, and communication come more naturally. A genuine return to herself after the Saturn stretch just before it." },
  { planet: "Ketu",    start: "2028-05-21", end: "2028-07-21", level: "gentle",   label: "Gentle vigilance",
    desc: "A short, foggy, detached stretch — motivation can feel quietly absent. Needs a light check-in, not heavy correction; it passes quickly." },
  { planet: "Venus",   start: "2028-07-21", end: "2029-01-12", level: "flow",     label: "Flow",
    desc: "Harmony returns for a longer stretch — a strong period for relationships, partnership-based work, and ease in the craft." },
  { planet: "Sun",     start: "2029-01-12", end: "2029-03-04", level: "gentle",   label: "Gentle vigilance",
    desc: "Same visibility theme, now with more experience and reputation behind it — likely real leadership or spotlight moments rather than just exposure." },
  { planet: "Moon",    start: "2029-03-04", end: "2029-05-29", level: "gentle",   label: "Gentle vigilance",
    desc: "A longer emotional-sensitivity stretch than the first Moon window — needs sustained conscious balance, not just momentary awareness." },
  { planet: "Mars",    start: "2029-05-29", end: "2029-07-29", level: "high",     label: "High vigilance",
    desc: "Same friction-and-injury caution as the first Mars window, landing close to a school year's end when fatigue is already higher." },
  { planet: "Rahu",    start: "2029-07-29", end: "2030-01-03", level: "high",     label: "High vigilance",
    desc: "Nearly as long as the first Rahu stretch, arriving as she approaches her final year — the temptation to chase something new right before the home stretch." },
  { planet: "Jupiter", start: "2030-01-03", end: "2030-05-20", level: "gentle",   label: "Gentle vigilance (effort required)",
    desc: "Growth and opportunity on offer, but this Jupiter is weak in her chart — nothing arrives on easy luck. Expansion has to be worked for, right as she closes out Berklee." },
];

function getCurrentAndNext(date = new Date()) {
  const iso = date.toISOString().slice(0, 10);
  let current = null;
  let next = null;
  for (let i = 0; i < PERIODS.length; i++) {
    if (iso >= PERIODS[i].start && iso < PERIODS[i].end) {
      current = PERIODS[i];
      next = PERIODS[i + 1] || null;
      break;
    }
  }
  return { current, next };
}

module.exports = { PERIODS, getCurrentAndNext };
