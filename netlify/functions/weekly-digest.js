const { getCurrentAndNext } = require("./periods");

const RESEND_API_URL = "https://api.resend.com/emails";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

function daysBetween(a, b) {
  const ms = new Date(b) - new Date(a);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function levelColor(level) {
  return { flow: "#3fbf82", gentle: "#e0b872", high: "#e0806c", heaviest: "#c56a6a" }[level] || "#c9a15c";
}

async function writeFramingNote(current, next, daysLeft) {
  const prompt = `Julia is currently in a "${current.label}" vigilance period (${current.planet}), described as: "${current.desc}" It has ${daysLeft} days left, then shifts to a "${next ? next.label : "a new"}" period${next ? ` (${next.planet})` : ""}.

Write exactly 2 warm, grounding sentences for a weekly email to her — not generic positivity, specific to this period. Plain text only, no greeting, no sign-off, just the 2 sentences.`;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
}

function buildEmailHtml({ current, next, daysLeft, framingNote }) {
  const color = levelColor(current.level);
  const nextLine = next
    ? `Then shifts into <b>${next.label}</b> (${next.planet}) on ${next.start}.`
    : `This is the final mapped period — new territory after this one.`;

  return `
  <div style="font-family:Georgia,serif; background:#0e2b22; color:#f4ecda; padding:32px; max-width:560px; margin:0 auto;">
    <div style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#c9a15c; margin-bottom:6px;">This Week's Outlook</div>
    <h1 style="font-size:26px; margin:0 0 18px; font-weight:600;">Julia</h1>
    <div style="background:${color}22; border-left:3px solid ${color}; padding:14px 18px; border-radius:4px; margin-bottom:18px;">
      <div style="font-size:13px; letter-spacing:1px; text-transform:uppercase; color:${color};">${current.label} · ${current.planet}</div>
      <div style="font-size:14px; color:#f4ecda; margin-top:6px;">${current.desc}</div>
    </div>
    <p style="font-size:14px; line-height:1.6; color:#f4ecda;">${framingNote}</p>
    <p style="font-size:13px; line-height:1.6; color:#cfc6b0; margin-top:20px;">
      ${daysLeft} day${daysLeft === 1 ? "" : "s"} left in this period. ${nextLine}
    </p>
    <p style="font-size:11px; color:#8b764f; margin-top:28px; letter-spacing:1px; text-transform:uppercase;">
      Vedic astrology · Human Design · Numerology
    </p>
  </div>`;
}

exports.handler = async () => {
  const { current, next } = getCurrentAndNext();
  if (!current) {
    console.log("No mapped period for today's date — skipping digest.");
    return { statusCode: 200, body: "No period mapped for today." };
  }

  const daysLeft = Math.max(0, daysBetween(new Date().toISOString().slice(0, 10), current.end));

  let framingNote;
  try {
    framingNote = await writeFramingNote(current, next, daysLeft);
  } catch (err) {
    console.error("Framing note generation failed, using fallback:", err);
    framingNote = "Keep showing up for the small, steady things this week — they add up more than they feel like they do in the moment.";
  }

  const html = buildEmailHtml({ current, next, daysLeft, framingNote });

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "onboarding@resend.dev",
      to: [process.env.JULIA_EMAIL],
      subject: `This Week: ${current.label} (${current.planet})`,
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Resend send failed:", errText);
    return { statusCode: 502, body: `Email send failed: ${errText}` };
  }

  return { statusCode: 200, body: "Digest sent." };
};

// Schedule is declared in netlify.toml (this function's CommonJS style
// isn't reliably recognized by the inline `exports.config` schedule syntax).
