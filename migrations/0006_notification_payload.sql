-- Store notification copy so the hourly worker can actually deliver.
ALTER TABLE notification_log ADD COLUMN payload TEXT;
