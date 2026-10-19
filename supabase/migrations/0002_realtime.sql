-- Talent Thread · live chat and notifications
-- Supabase Realtime only streams tables that are in the supabase_realtime publication.
-- Row level security still applies: people only receive rows they're allowed to read.
alter publication supabase_realtime add table messages, notifications;
