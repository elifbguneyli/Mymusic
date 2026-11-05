// SunoAPI.org calls this URL when a generation task progresses or completes.
// The frontend gets its results by polling the status function instead, so
// this just needs to acknowledge receipt with 200 OK.
exports.handler = async () => {
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
