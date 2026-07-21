-- Private bucket for worn-part photos (form uploads + inbound MMS).
-- Split from 0001: storage.buckets does not exist until the project's
-- storage service finishes provisioning, so this runs as its own step.
insert into storage.buckets (id, name, public)
values ('lead-attachments', 'lead-attachments', false)
on conflict (id) do nothing;
