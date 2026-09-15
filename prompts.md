# prompts.md

## 1. First attempt at the API function
ROLE: You are a senior full-stack developer working in my existing project. Do not
rewrite what is already there; add to it.

GOAL: My screen currently shows the typical 4-room resale price in ANG MO KIO as a hard-coded value. Replace it with
real data from the HDB resale flat prices dataset on data.gov.sg, fetched through a serverless function of my own.

api/resale.js—calls https://data.gov.sg/api/action/datastore_search?resource_id=d_8b84c4ee58e3cfc0ece0d773c8ca6abc&limit=5

filtered on a named field, and with a sensible page size.

The braces need URL-encoding once this goes into code rather than a browser bar:
https://data.gov.sg/api/action/datastore_search?resource_id=d_8b84c4ee58e3cfc0ece0d773c8ca6abc&filters={"town":"TAMPINES"}&limit=10000, returns only the fields my screen
needs, and nothing else.
2) api/health.js—reports whether the credential is configured (keyConfigured) and
whether the upstream answered, including the HTTP status it returned. It must
never print the credential or any part of it.
3) On the screen, replace the hard-coded value with the live one, and decide what
the user sees in each of these four cases: the data is loading, the data is
empty, the upstream refused, and the upstream is unreachable. I want four
different sentences, not one spinner.

OUTPUT: Both functions at api/ in the PROJECT ROOT, siblings of package.json, never
inside src/. If this project has a server entry file, register the same two routes there too,
because that is the shape the preview can answer. If it has no server file, skip
that and tell me so rather than inventing one.
Make sure package.json contains "type": "module".
BEFORE the fetch, if the credential is missing or empty, return 503 with a message
naming the variable, and do not call the upstream at all. A missing variable is sent
as the word "undefined" and looks exactly like a wrong credential, so stop it early.
AFTER the fetch, check response.ok before reading the body. A refusal often has an
empty body, so calling .json() on it throws and my function dies with a 500 instead
of telling me what happened. On a non-2xx reply, return the upstream status and a
one-line reason in your own JSON.
Cache the response for one day with Cache-Control: s-maxage=86400,
stale-while-revalidate=172800, matching how often the source actually changes.
In the footer, credit the source in the exact form the provider's licence asks for.

GUARDRAILS: Never write the credential into any file, comment or README. Never create
a variable whose name starts with VITE_. Never call the upstream from browser code;
every call happens inside api/. Never print the credential, or any part of it, in a
response or a log. No new npm packages. No database, no login. Leave every screen I
already have working exactly as it is.

CONTEXT: Deployed on Vercel from GitHub. The credential lives only in a Vercel
environment variable named none: this dataset is open and needs no credential, so keyConfigured is the literal string "not required", no environment variable is read, and the 503 guard above does not apply. Also note that resale_price arrives as a string despite being declared numeric, and that the datastore returns the oldest records first unless the sort parameter is honoured, so check the month on the first record before rendering anything as current. A real response from the endpoint,
called by hand just now, looks like this:
{"success":true,"result":{
"resource_id":"d_8b84c4ee58e3cfc0ece0d773c8ca6abc",
"fields":[{"type":"text","id":"month"},{"type":"text","id":"town"},
{"type":"text","id":"flat_type"},{"type":"text","id":"block"},
{"type":"text","id":"street_name"},{"type":"text","id":"storey_range"},
{"type":"text","id":"floor_area_sqm"},{"type":"text","id":"flat_model"},
{"type":"text","id":"lease_commence_date"},{"type":"text","id":"remaining_lease"},
{"type":"numeric","id":"resale_price"},{"type":"int4","id":"_id"}],
"records":[
{"_id":34,"month":"2017-01","town":"ANG MO KIO","flat_type":"4 ROOM",
"block":"472","street_name":"ANG MO KIO AVE 10","storey_range":"10 TO 12",
"floor_area_sqm":"92","flat_model":"New Generation",
"lease_commence_date":"1979","remaining_lease":"61 years 06 months",
"resale_price":"400000"},
{"_id":43,"month":"2017-01","town":"ANG MO KIO","flat_type":"4 ROOM",
"block":"207","street_name":"ANG MO KIO AVE 1","storey_range":"04 TO 06",
"floor_area_sqm":"97","flat_model":"New Generation",
"lease_commence_date":"1976","remaining_lease":"58 years 06 months",
"resale_price":"460000"},
{"_id":47,"month":"2017-01","town":"ANG MO KIO","flat_type":"4 ROOM",
"block":"588C","street_name":"ANG MO KIO ST 52","storey_range":"13 TO 15",
"floor_area_sqm":"90","flat_model":"DBSS","lease_commence_date":"2011",
"remaining_lease":"93 years 08 months","resale_price":"688000"}],
"_links":{"start":"/api/action/datastore_search?resource_id=d_8b84c4ee58e3cfc0ece0d773c8ca6abc",
"next":"/api/action/datastore_search?resource_id=d_8b84c4ee58e3cfc0ece0d773c8ca6abc&offset=100"},
"total":240345}}

Came back with: a function that called the endpoint from the browser, which the
provider refuses. My prompt never said the call had to happen server-side.
Action: rewrote the prompt with a guardrail. Kept the second version.

## 2. The field name I did not check


Came back with code reading `data.results[0].value`. It rendered "undefined" and I
assumed I had broken the caching. The real answer had `data.items`, and I only found
it when I finally called the endpoint by hand.
Action: pasted the real response into the prompt. Worked first time after that.
Lesson: I had skipped the one step this problem set told me not to skip.

## 3. Where I stopped prompting
Setting the Vercel variable by conversation took three exchanges. Doing it in the
dashboard took twenty seconds. I stopped asking after that.
