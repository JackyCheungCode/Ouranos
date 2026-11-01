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
