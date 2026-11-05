const { sunoFetch, json } = require("./lib/suno");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json(405, { code: 405, msg: "Method not allowed" });
  }

  const taskId = event.queryStringParameters && event.queryStringParameters.taskId;
  if (!taskId) {
    return json(400, { code: 400, msg: "Missing taskId query parameter" });
  }

  try {
    const { status, body } = await sunoFetch(
      `/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`,
      { method: "GET" }
    );
    return json(status, body);
  } catch (err) {
    return json(500, { code: 500, msg: err.message });
  }
};
