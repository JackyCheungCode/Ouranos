
create index if not exists lead_inbox_company_inbox_idx on public.lead_inbox_records(company_inbox_id) where company_inbox_id is not null;
create index if not exists lead_inbox_duplicate_of_idx on public.lead_inbox_records(duplicate_of) where duplicate_of is not null;
create index if not exists lead_inbox_promoted_company_idx on public.lead_inbox_records(promoted_company_id) where promoted_company_id is not null;
create index if not exists lead_inbox_promoted_contact_idx on public.lead_inbox_records(promoted_contact_id) where promoted_contact_id is not null;
create index if not exists lead_inbox_source_record_idx on public.lead_inbox_records(source_record_id) where source_record_id is not null;
create index if not exists lead_inbox_task_fk_idx on public.lead_inbox_records(task_id) where task_id is not null;
create index if not exists lead_inbox_reviewed_by_idx on public.lead_inbox_records(reviewed_by) where reviewed_by is not null;
create index if not exists lead_inbox_promoted_by_idx on public.lead_inbox_records(promoted_by) where promoted_by is not null;
create index if not exists lead_inbox_duplicate_candidate_fk_idx on public.lead_inbox_duplicate_candidates(candidate_record_id);
create index if not exists lead_inbox_duplicate_resolved_by_idx on public.lead_inbox_duplicate_candidates(resolved_by) where resolved_by is not null;
create index if not exists lead_inbox_event_record_fk_idx on public.lead_inbox_review_events(record_id);
create index if not exists lead_inbox_event_actor_idx on public.lead_inbox_review_events(actor_id) where actor_id is not null;
