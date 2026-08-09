const { PERIODS, getCurrentAndNext } = require("./periods");
const { getEraForDate, getBerkleeYear } = require("./eras");

const RESEND_API_URL = "https://api.resend.com/emails";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

function levelColor(level) {
  return { flow: "#3fbf82", gentle: "#e0b872", high: "#e0806c", heaviest: "#c56a6a" }[level] || "#c9a15c";
}

// Find any vigilance-level shifts starting within the next N days.
function upcomingShifts(fromDate, days = 30) {
  const from = fromDate.toISOString().slice(0, 10);
  const to = new Date(fromDate.getTime() + days * 86400000).toISOString().slice(0, 10);
  return PERIODS.filter((p) => p.start > from && p.start <= to);
}

async function writeMonthlyNote({ era, current, shifts, berkleeYear }) {
  const shiftText = shifts.length
    ? shifts.map((s) => `shifts into "${s.label}" (${s.planet}) on ${s.start}`).join("; ")
    : "no level shift in the next 30 days — the current period continues";

  const prompt = `Write a short monthly check-in for Julia (3-4 sentences, plain text, no greeting/sign-off).

Context: She's in Berklee Year ${berkleeYear}. The deep current right now is "${era.name}" (${era.theme}) — ${era.context}
Current vigilance period: "${current.label}" (${current.planet}). What that level means in this era specifically: ${era.levelMeanings[current.level] || current.desc}
Looking ahead 30 days: ${shiftText}.

Write it as a grounding, zoomed-out monthly note — bigger picture than a weekly check-in, more about the arc she's in than the immediate week. Specific to her situation, not generic encouragement.`;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
}

function buildEmailHtml({ era, current, shifts, berkleeYear, note }) {
  const color = levelColor(current.level);
  const shiftsHtml = shifts.length
    ? shifts
        .map((s) => {
          const c = levelColor(s.level);
          return `<div style="margin-top:8px; padding:10px 14px; background:${c}18; border-left:2px solid ${c}; border-radius:4px;">
            <b style="color:${c};">${s.label}</b> (${s.planet}) begins <b>${s.start}</b>
          </div>`;
        })
        .join("")
    : `<p style="font-size:13px; color:#cfc6b0;">No vigilance-level shift in the next 30 days — the current period carries through.</p>`;

  return `
  <div style="font-family:Georgia,serif; background:#0e2b22; color:#f4ecda; padding:32px; max-width:560px; margin:0 auto;">
    <div style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#c9a15c; margin-bottom:6px;">This Month's Outlook · Berklee Year ${berkleeYear}</div>
    <h1 style="font-size:26px; margin:0 0 4px; font-weight:600;">Julia</h1>
    <div style="font-size:13px; color:#cfc6b0; margin-bottom:18px;">${era.name} — ${era.theme}</div>

    <div style="background:${color}22; border-left:3px solid ${color}; padding:14px 18px; border-radius:4px; margin-bottom:18px;">
      <div style="font-size:13px; letter-spacing:1px; text-transform:uppercase; color:${color};">Right Now · ${current.label} (${current.planet})</div>
      <div style="font-size:14px; color:#f4ecda; margin-top:6px;">${era.levelMeanings[current.level] || current.desc}</div>
    </div>

    <p style="font-size:14px; line-height:1.6; color:#f4ecda;">${note}</p>

    <div style="margin-top:22px;">
      <div style="font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#8b764f; margin-bottom:6px;">Coming Up (Next 30 Days)</div>
      ${shiftsHtml}
    </div>

    <p style="font-size:11px; color:#8b764f; margin-top:28px; letter-spacing:1px; text-transform:uppercase;">
      Vedic astrology · Human Design · Numerology
    </p>
  </div>`;
}

exports.handler = async () => {
  const today = new Date();
  const { current } = getCurrentAndNext(today);
  const era = getEraForDate(today);
  const berkleeYear = getBerkleeYear(today);

  if (!current || !era) {
    console.log("No mapped period/era for today — skipping monthly digest.");
    return { statusCode: 200, body: "Nothing mapped for today." };
  }

  const shifts = upcomingShifts(today, 30);

  let note;
  try {
    note = await writeMonthlyNote({ era, current, shifts, berkleeYear });
  } catch (err) {
    console.error("Monthly note generation failed, using fallback:", err);
    note = "Zoom out for a second this month: the deep current you're in shapes what the small stuff means. Keep doing the steady, unglamorous work — it's building toward the arc you're actually in, not just this week.";
  }

  const html = buildEmailHtml({ era, current, shifts, berkleeYear, note });

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "onboarding@resend.dev",
      to: [process.env.JULIA_EMAIL],
      subject: `This Month: ${era.name} — ${current.label}`,
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Resend send failed:", errText);
    return { statusCode: 502, body: `Email send failed: ${errText}` };
  }

  return { statusCode: 200, body: "Monthly digest sent." };
};

// Netlify Scheduled Function: runs the 1st of every month at 13:00 UTC.
exports.config = {
  schedule: "0 13 1 * *",
};
