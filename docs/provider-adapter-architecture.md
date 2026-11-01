# Provider and channel adapter architecture

Ouranos treats a provider as an execution platform, not as a channel. A channel is a discovery capability (for example Google Maps, LinkedIn, Instagram or Amazon). A provider can expose multiple adapters for one or more channels, and multiple providers can serve the same channel.

## Core model

- `integration_connections`: workspace-scoped provider credentials. Secrets are referenced by Vault IDs and are never exposed to the browser.
- `discovery_adapter_catalog`: one adapter definition per provider + channel + concrete execution method. It stores the provider product/Actor ID, version, input schema, output schema, normalization mapping, capabilities, pricing model and verification state.
- `lead_search_tasks`: user intent and selected channel/market scope.
- `lead_task_runs`: one execution attempt for one concrete adapter. It stores the exact Actor ID, adapter version, validated input payload, adapter/config snapshot, output mapping snapshot, retry count, idempotency key, usage metrics and billing details.
- `lead_source_records`: immutable raw source evidence.
- `lead_inbox_records`: normalized company/contact candidates awaiting human review.

## Apify is Actor-specific

Apify is not represented by one generic scraper. A Maps search and a LinkedIn company search can use different Actors with different required fields, optional fields, output formats, pagination, run modes and pricing.

For every Apify adapter:
1. Resolve and verify the exact Actor ID in the Apify account/store.
2. Retrieve that Actor's current input schema and output schema/metadata.
3. Build a channel-specific form from the Actor input schema. Do not reuse a universal Apify input form.
4. Validate user parameters against that schema before queueing a run.
5. Snapshot Actor ID, adapter version, input JSON and output mapping on the task run.
6. Preserve the raw dataset item and map it into the canonical company/contact model only after the run completes.

Actor IDs and schemas are configurable records; do not hardcode a guessed Actor ID or assume every Actor returns the same fields. Public Actors may change, be renamed, require different permissions, or incur different costs.

## Execution lifecycle

`search profile → eligible channel adapters → input-schema validation → queued adapter run → provider execution → polling/webhook → raw source evidence → field mapping → normalization → duplicate candidates → lead inbox → human approval → explicit promotion`

Each adapter declares whether it is synchronous, asynchronous or webhook-driven. A retry creates a new attempt/run record and keeps the previous provider job ID and output evidence for auditability. Idempotency prevents duplicate starts for the same workspace/task/adapter/input snapshot.

## Canonical mapping

Adapters retain the provider's raw payload. Field mapping converts source-specific names into canonical fields such as company name, website/domain, country, address, business email, phone, social profiles, contact name, job title and product categories. Missing or ambiguous fields remain null; they are not fabricated.

## Cost and safety

Pricing is adapter-specific. Store provider-reported credits, usage units, currency, cost amount, cost basis and the provider response metadata on each run. A connection test must prefer a documented, non-billable authentication/metadata endpoint. If a provider offers no such endpoint, Ouranos reports that limitation and does not send a paid scrape just to display “connected”.

## Provider-specific execution contracts

The seven providers must not be flattened into one request format:

| Provider | Concrete execution unit | Inputs / lifecycle to preserve |
| --- | --- | --- |
| Apify | Actor ID + build | Each Actor's own input/output schema; run ID; default dataset ID; dataset pagination; Actor-specific pricing |
| Bright Data | Dataset ID / scraper product | Dataset-specific input fields; sync scrape or async trigger; snapshot ID; progress polling; result download; dataset pricing |
| Octoparse | AgentTools template or existing task | Template inputSchema; source-tree option keys; parameters serialized as JSON string; task ID; export status and retry guidance; external user ID |
| Firecrawl | Search, scrape or crawl operation | Different request schemas per operation; crawl job ID; status polling; page limits and credit usage |
| PhantomBuster | Agent ID + agent argument | Agent-specific argument schema; launch/container ID; output/status polling; result-object or output URL |
| TexAu | Named REST action | Per-action request/response schema; x-api-key; sync vs async execution ID; action-level credit/billing and webhook/inquiry flow |
| 跨境魔方 | Named API endpoint | Endpoint-specific filters and country/product/company fields; page size; returned field schema; per-endpoint RMB pricing |

A provider adapter is responsible for its own authentication header, endpoint paths, request serialization, async lifecycle, pagination, retry classification, result extraction and usage/cost parsing. The orchestrator only sees the shared adapter interface and normalized run outcome.

### Initial verified provider behaviors

- Apify uses Bearer API tokens and exposes Actor metadata/build schemas. Its input schema is a JSON Schema-like document and is the source of truth for per-Actor forms.
- Octoparse AgentTools uses x-api-key; searchTemplates exposes each template's inputSchema and outputSchema. executeTask additionally needs an external user ID and JSON-stringified parameters; exportData returns the async collection/export state.
- PhantomBuster uses X-Phantombuster-Key-1; launch returns a container ID that is used to poll output/status.
- TexAu's current API uses https://v3-api.texau.com/api/v1 and x-api-key. It exposes action-specific request schemas and has sync/async actions; successful requests may consume credits.
- Bright Data's Web Scraper API uses Bearer tokens and a dataset trigger/progress/download lifecycle.
- Cross-border Magic documents Bearer API-key auth and per-endpoint usage prices. The adapter must check price/expected rows before scheduling a paid endpoint.

Do not use a provider's API key test as proof that every Actor, dataset, template, agent or action is available. Connection authentication and channel adapter readiness are separate statuses.
