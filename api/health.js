/**
 * Serverless function for health and connectivity verification
 * Endpoint: /api/health
 */

const RESOURCE_ID = 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc';

export default async function handler(req, res) {
  // Polyfill helper for environments where res.status or res.json are not pre-bound
  if (!res.status) {
    res.status = function (code) {
      res.statusCode = code;
      return res;
    };
  }
  if (!res.json) {
    res.json = function (data) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return res;
    };
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0');

  // Key configuration report:
  // "this dataset is open and needs no credential, so keyConfigured is the literal string 'not required',
  // no environment variable is read"
  const keyConfigured = 'not required';

  const upstreamUrl = `https://data.gov.sg/api/action/datastore_search?resource_id=${encodeURIComponent(
    RESOURCE_ID
  )}&limit=1`;

  try {
    const upstreamResponse = await fetch(upstreamUrl);

    // Reports whether upstream answered, including the HTTP status it returned
    const upstreamAnswered = true;
    const upstreamStatus = upstreamResponse.status;

    return res.status(upstreamResponse.ok ? 200 : upstreamResponse.status).json({
      status: upstreamResponse.ok ? 'healthy' : 'upstream_error',
      keyConfigured,
      upstreamAnswered,
      upstreamStatus,
    });
  } catch (error) {
    return res.status(502).json({
      status: 'unhealthy',
      keyConfigured,
      upstreamAnswered: false,
      upstreamStatus: null,
      reason: error instanceof Error ? error.message : 'Upstream is unreachable',
    });
  }
}
