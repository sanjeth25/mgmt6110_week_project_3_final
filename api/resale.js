/**
 * Serverless function for fetching HDB resale flat prices from data.gov.sg
 * Endpoint: /api/resale
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

  // Parse search query parameters if available
  const protocol = req.headers?.['x-forwarded-proto'] || 'http';
  const host = req.headers?.host || 'localhost';
  const reqUrl = new URL(req.url || '/api/resale', `${protocol}://${host}`);

  const town = reqUrl.searchParams.get('town') || 'ANG MO KIO';
  const flatType = reqUrl.searchParams.get('flat_type') || '4 ROOM';
  const limitParam = reqUrl.searchParams.get('limit') || '100';
  const limit = Math.min(Math.max(parseInt(limitParam, 10) || 100, 1), 500);

  // Per specifications:
  // "The credential lives only in a Vercel environment variable named none:
  // this dataset is open and needs no credential, so keyConfigured is the literal string 'not required',
  // no environment variable is read, and the 503 guard above does not apply."

  // Cache response for one day with Cache-Control: s-maxage=86400, stale-while-revalidate=172800
  res.setHeader(
    'Cache-Control',
    's-maxage=86400, stale-while-revalidate=172800'
  );

  // Construct query with encoded filters and sort
  const filters = JSON.stringify({ town, flat_type: flatType });
  const upstreamUrl = `https://data.gov.sg/api/action/datastore_search?resource_id=${encodeURIComponent(
    RESOURCE_ID
  )}&filters=${encodeURIComponent(filters)}&sort=${encodeURIComponent(
    'month desc, _id desc'
  )}&limit=${limit}`;

  try {
    const upstreamResponse = await fetch(upstreamUrl);

    // AFTER the fetch, check response.ok before reading the body.
    // A refusal often has an empty body, so calling .json() on it throws 500.
    // On non-2xx reply, return upstream status and a one-line reason in our own JSON.
    if (!upstreamResponse.ok) {
      return res.status(upstreamResponse.status).json({
        error: 'Upstream refused request',
        upstreamStatus: upstreamResponse.status,
        reason: upstreamResponse.statusText || 'Upstream returned a non-2xx status code',
      });
    }

    const data = await upstreamResponse.json();

    if (!data || !data.success || !data.result) {
      return res.status(502).json({
        error: 'Upstream responded with unsuccessful status',
        upstreamStatus: upstreamResponse.status,
        reason: 'The upstream datastore indicated failure or malformed result format',
      });
    }

    const records = data.result.records || [];

    if (records.length === 0) {
      return res.status(200).json({
        town,
        flat_type: flatType,
        month: null,
        typical_price: null,
        sample_size: 0,
        records: [],
      });
    }

    // Sort check: check the month on the first record before rendering anything as current
    const latestMonth = records[0].month;
    const latestMonthRecords = records.filter((r) => r.month === latestMonth);

    // Calculate typical resale price (median price of the latest month's records)
    // Note: resale_price arrives as a string despite being declared numeric
    const parsedPrices = latestMonthRecords
      .map((r) => Number(r.resale_price))
      .filter((p) => !isNaN(p))
      .sort((a, b) => a - b);

    let typicalPrice = 0;
    if (parsedPrices.length > 0) {
      const mid = Math.floor(parsedPrices.length / 2);
      typicalPrice =
        parsedPrices.length % 2 !== 0
          ? parsedPrices[mid]
          : Math.round((parsedPrices[mid - 1] + parsedPrices[mid]) / 2);
    }

    // Return ONLY the fields the screen needs, and nothing else
    const minimalRecords = records.slice(0, 20).map((r) => ({
      id: r._id,
      month: r.month,
      block: r.block,
      street_name: r.street_name,
      storey_range: r.storey_range,
      floor_area_sqm: Number(r.floor_area_sqm) || 0,
      resale_price: Number(r.resale_price) || 0,
    }));

    return res.status(200).json({
      town,
      flat_type: flatType,
      month: latestMonth,
      typical_price: typicalPrice,
      sample_size: latestMonthRecords.length,
      min_price: parsedPrices[0] || typicalPrice,
      max_price: parsedPrices[parsedPrices.length - 1] || typicalPrice,
      records: minimalRecords,
    });
  } catch (error) {
    // Network or connection failure: upstream is unreachable
    return res.status(502).json({
      error: 'Upstream is unreachable',
      reason: error instanceof Error ? error.message : 'Network error communicating with data.gov.sg',
    });
  }
}
