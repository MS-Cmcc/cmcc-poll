-- Add single_choice to the allowed question_type values
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_question_type_check;
ALTER TABLE votes ADD CONSTRAINT votes_question_type_check
  CHECK (question_type IN ('single_choice', 'multiple_choice', 'word_cloud', 'open_ended', 'scale'));
