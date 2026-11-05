const { sunoFetch, json } = require("./lib/suno");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json(405, { code: 405, msg: "Method not allowed" });
  }

  try {
    const { status, body } = await sunoFetch("/api/v1/generate/credit", {
      method: "GET",
    });
    return json(status, body);
  } catch (err) {
    return json(500, { code: 500, msg: err.message });
  }
};
