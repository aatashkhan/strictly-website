-- Session 2A/2B: Add venue access dimension columns
-- Three separate dimensions: booking difficulty, wait expectation, conditional hotel access
-- Plus ai_generated_note for saving Claude's blurbs

ALTER TABLE venues ADD COLUMN IF NOT EXISTS booking_difficulty TEXT DEFAULT 'walk_in';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS expect_wait BOOLEAN DEFAULT FALSE;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS conditional_on_hotel TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS ai_generated_note TEXT;
