-- Location label for exam / station assignments (free text)
ALTER TABLE stations ADD COLUMN IF NOT EXISTS location text;
