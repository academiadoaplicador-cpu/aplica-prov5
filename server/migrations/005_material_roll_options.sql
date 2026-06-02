ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS roll_widths_m JSONB,
  ADD COLUMN IF NOT EXISTS roll_lengths_m JSONB;

UPDATE materials
SET roll_widths_m = jsonb_build_array(roll_width_m)
WHERE roll_width_m IS NOT NULL AND roll_widths_m IS NULL;

UPDATE materials
SET roll_lengths_m = jsonb_build_array(roll_length_m)
WHERE roll_length_m IS NOT NULL AND roll_lengths_m IS NULL;
