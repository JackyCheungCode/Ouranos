# Ouranos

## Lead Discovery — Schema-driven Actor inputs

Apify discovery tasks use the selected Actor's live Input Schema as the source of truth.

- Actor input fields are rendered with Chinese labels and help text; original field keys and enum values are retained in the submitted JSON.
- Required fields and conditional search-entry requirements are validated before enqueue and again before execution.
- Users select one explicit Actor per task. Input mappings and generic defaults are not used to construct Apify payloads.
- Each run stores an immutable input and Schema snapshot, a canonical Schema hash, and the Actor build tag. Execution stops if the catalog Schema or Actor version has drifted.
- No Actor run is launched during deployment verification; live provider testing requires an explicitly approved test run.


## AI-guided Actor configuration

The lead discovery wizard is AI-first:

- Users describe their goal in natural language. Workers AI identifies a supported platform, but does not select an Actor on the user's behalf.
- Platform, provider, market, task limits, Actor search, and manual Schema fields are grouped under a collapsed **Manual configuration** section.
- Users manually search and select an Actor. The app then reads that Actor's live Input Schema and starts a multi-turn Chinese conversation to clarify missing details.
- Each AI turn updates the same Schema-backed form state used by the live parameter preview and final submission. Users can expand manual configuration to override values.
- Workers AI returns assistant_message, missing_information, field_explanations, and actor_input. Required-field and type/format validation remains deterministic in the frontend and enqueue/execution pipeline.
- The final task snapshot stores the exact validated actor_input sent for execution, together with the conversation and field explanations.

The conversational Worker source is maintained in `workers/ouranos-ai-assistant/index.js` and deployed as `ouranos-ai-assistant`.


## Workers AI context budgeting and Odoo-style UI

- Actor input Schema is compacted without removing root required keys or core type/format/range/pattern constraints.
- Large Actor inputs are split into small Schema property batches and processed sequentially; each batch only receives the relevant previous parameter values.
- Conversation history is bounded to the latest six short messages; long descriptions, examples and oversized enums are compacted. Full Schema remains the source of truth for frontend validation and task submission.
- Output token budgets are sized per batch. Context-limit errors trigger a recursive split instead of returning a raw provider 5021 error.
- Oversized enums are marked as truncated for AI context; the AI must ask for an explicit choice rather than guessing. The frontend still validates against the complete original enum.
- The lead-discovery UI uses an Odoo-inspired purple backend navbar, compact panels, neutral workspace background, square controls, and restrained status colors.


## 12 customer discovery pages

The **潜在客户搜索** workspace starts with twelve focused discovery entry pages:

1. 地图发现 — local businesses and storefronts.
2. 社交媒体发现 — public business profiles and brand accounts, not posts or comments.
3. 搜索引擎发现 — search-led discovery, with only structured company/contact profiles eligible for the lead inbox.
4. B2B 采购商发现 — buyers, importers, wholesalers and trade businesses.
5. 独立站发现 — independent stores and brand websites.
6. 跨境电商卖家发现 — seller and merchant profiles, not product listings.
7. 企业数据库发现 — registered entities and trade participants.
8. 联系人及决策人发现 — professional contacts linked to target companies.
9. 行业目录发现 — company records from industry directories.
10. 招投标与采购需求 — procurement organizations and tendering entities.
11. 展会及参展商发现 — exhibitor companies and brands.
12. 网站线索发现 — company profiles and public business contact details extracted from websites.

All pages reuse the same provider/Actor directory, live Actor Input Schema form, task queue, raw source evidence, dynamic result ingestion, deduplication and manual lead review. Page-specific platform lists and search guidance are configuration-driven in `src/apps/lead-finder/DiscoveryPageHub.tsx`; actual platform availability still comes from `discovery_platforms`.

### Customer-output verification gate

A provider Actor must be explicitly reviewed before it can run as a lead source:

- `verification_status = verified`
- `maintenance_status = maintained`
- `supported_record_types` must explicitly include `company` and/or `contact`
- `is_active = true`

Reading an Actor's Input Schema does not constitute output verification. New Actors are stored as unverified and inactive by default. Re-syncing an unchanged Actor build preserves its review status; a changed build is sent back for review. Enqueue rejects unverified, unmaintained, or non-customer outputs.

Approval requires a successful Apify Run ID produced by the Actor's current default Build. The backend verifies the run's Actor, Build and status, then inspects real Dataset records for company/contact fields; a manual note or checkbox alone cannot approve an Actor. Running a sample Actor may incur Apify usage charges, so use a small, cost-conscious sample.

Input fields remain Actor-defined and are submitted with their original keys and enum values. Output field mapping is optional; the ingestion worker uses its supported common-field fallbacks while preserving each complete raw source payload. No post, comment, video, product listing or raw search-result snippet is itself treated as a customer record.
