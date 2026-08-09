const { getStore } = require("@netlify/blobs");

function checkAuth(event) {
  const provided = event.headers["x-coach-passphrase"];
  const required = process.env.COACH_PASSPHRASE;
  if (!required) return true;
  return provided === required;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }
  if (!checkAuth(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const store = getStore("julia-coach-memory");
  await store.setJSON("memory", { history: [], summary: "" });

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
