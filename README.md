# Ouranos

## Lead Discovery — Schema-driven Actor inputs

Apify discovery tasks use the selected Actor's live Input Schema as the source of truth.

- Actor input fields are rendered with Chinese labels and help text; original field keys and enum values are retained in the submitted JSON.
- Required fields and conditional search-entry requirements are validated before enqueue and again before execution.
- Users select one explicit Actor per task. Input mappings and generic defaults are not used to construct Apify payloads.
- Each run stores an immutable input and Schema snapshot, a canonical Schema hash, and the Actor build tag. Execution stops if the catalog Schema or Actor version has drifted.
- No Actor run is launched during deployment verification; live provider testing requires an explicitly approved test run.
