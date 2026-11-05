const { sunoFetch, json } = require("./lib/suno");

const ALLOWED_FIELDS = [
  "prompt",
  "lyrics",
  "style",
  "title",
  "customMode",
  "instrumental",
  "model",
  "negativeTags",
  "vocalGender",
  "styleWeight",
  "weirdnessConstraint",
  "audioWeight",
];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { code: 405, msg: "Method not allowed" });
  }

  let input;
  try {
    input = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { code: 400, msg: "Invalid JSON body" });
  }

  const payload = {};
  for (const field of ALLOWED_FIELDS) {
    if (input[field] !== undefined && input[field] !== "") {
      payload[field] = input[field];
    }
  }

  if (!payload.model) payload.model = "V6";
  if (payload.customMode === undefined) payload.customMode = false;
  if (payload.instrumental === undefined) payload.instrumental = false;

  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  payload.callBackUrl = siteUrl
    ? `${siteUrl}/.netlify/functions/callback`
    : `https://example.com/.netlify/functions/callback`;

  try {
    const { status, body } = await sunoFetch("/api/v1/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return json(status, body);
  } catch (err) {
    return json(500, { code: 500, msg: err.message });
  }
};
