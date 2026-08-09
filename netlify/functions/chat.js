const { getStore } = require("@netlify/blobs");
const { JULIA_PROFILE } = require("./profile");

// --- Config ---
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 1000;
const HISTORY_CAP = 24; // keep last N messages in full before summarizing
const STORE_NAME = "julia-coach-memory";

// Netlify's automatic Blobs context injection is unreliable on some site
// configurations (a known platform issue). If BLOBS_SITE_ID and
// BLOBS_TOKEN are set, use them explicitly — otherwise fall back to
// automatic detection.
function getBlobStore() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: STORE_NAME, siteID, token });
  }
  return getStore(STORE_NAME);
}

// Simple shared-passphrase gate so a random visitor with the URL can't
// rack up API charges. Set COACH_PASSPHRASE in Netlify env vars.
function checkAuth(event) {
  const provided = event.headers["x-coach-passphrase"];
  const required = process.env.COACH_PASSPHRASE;
  if (!required) return true; // no passphrase configured — open (dev only)
  return provided === required;
}

async function callClaude(messages, system, maxTokens = MAX_TOKENS) {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const text = data.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
  return text;
}

// Compress the oldest chunk of history into a running summary so the
// conversation can grow indefinitely without the context (and cost)
// growing unbounded.
async function summarizeOldHistory(oldMessages, existingSummary) {
  const transcript = oldMessages
    .map((m) => `${m.role === "user" ? "Julia" : "Coach"}: ${m.content}`)
    .join("\n");

  const prompt = `Here is the existing running summary of earlier conversation with Julia (may be empty):
"""${existingSummary || "(none yet)"}"""

Here is the next chunk of conversation to fold in:
"""${transcript}"""

Write an updated running summary in plain prose, under 300 words. Preserve: durable facts Julia has shared about her life, ongoing situations, decisions she's made, and any recurring emotional patterns worth remembering. Do NOT include generic pleasantries or one-off small talk. Write only the summary, nothing else.`;

  const summary = await callClaude(
    [{ role: "user", content: prompt }],
    "You are compressing a coaching conversation history into a concise, durable memory summary.",
    500
  );
  return summary.trim();
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  if (!checkAuth(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const userMessage = (body.message || "").trim();
  if (!userMessage) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing 'message'" }) };
  }

  let store, memory;
  try {
    store = getBlobStore();
    const memoryRaw = await store.get("memory", { type: "json" });
    memory = memoryRaw || { history: [], summary: "" };
  } catch (err) {
    console.error("Blobs store error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Memory storage error: ${err.message}` }),
    };
  }

  // Build the system prompt: base profile + running summary of older convo
  const systemParts = [JULIA_PROFILE];
  if (memory.summary) {
    systemParts.push(
      `\nRUNNING SUMMARY OF EARLIER CONVERSATION WITH JULIA:\n${memory.summary}`
    );
  }
  const system = systemParts.join("\n");

  // Recent messages (already in Anthropic message format) + the new one
  const messages = [
    ...memory.history,
    { role: "user", content: userMessage },
  ];

  let replyText;
  try {
    replyText = await callClaude(messages, system);
  } catch (err) {
    console.error(err);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: `Coach is unavailable right now: ${err.message}` }),
    };
  }

  // Update history
  let newHistory = [
    ...memory.history,
    { role: "user", content: userMessage },
    { role: "assistant", content: replyText },
  ];

  let newSummary = memory.summary;

  // If history has grown past the cap, summarize the oldest half and trim
  if (newHistory.length > HISTORY_CAP) {
    const splitPoint = newHistory.length - HISTORY_CAP;
    const toSummarize = newHistory.slice(0, splitPoint);
    const keep = newHistory.slice(splitPoint);
    try {
      newSummary = await summarizeOldHistory(toSummarize, memory.summary);
      newHistory = keep;
    } catch (err) {
      // If summarization fails, just hard-trim so memory doesn't grow
      // unbounded; log it, don't fail the user's request over it.
      console.error("Summarization failed:", err);
      newHistory = newHistory.slice(-HISTORY_CAP);
    }
  }

  try {
    await store.setJSON("memory", { history: newHistory, summary: newSummary });
  } catch (err) {
    console.error("Blobs save error:", err);
    // Don't fail the whole request just because saving memory failed —
    // she still gets her reply, it just won't be remembered next time.
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reply: replyText }),
  };
};
