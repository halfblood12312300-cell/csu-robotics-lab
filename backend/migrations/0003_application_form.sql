-- Keep the original columns for existing records and older clients.
-- Snapshot each new submission so later form edits do not relabel old answers.
ALTER TABLE applications ADD COLUMN answers_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE applications ADD COLUMN form_snapshot TEXT NOT NULL DEFAULT '{}';
ALTER TABLE applications ADD COLUMN form_version TEXT NOT NULL DEFAULT 'legacy';
