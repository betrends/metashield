-- Add screenshot_url to cases so the error screenshot from the eligibility
-- wizard is visible in the admin portal alongside the case details.
alter table cases add column if not exists screenshot_url text;
