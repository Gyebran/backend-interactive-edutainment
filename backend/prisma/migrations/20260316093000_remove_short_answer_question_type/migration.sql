DO $$
DECLARE
    question_record RECORD;
    correct_option_text TEXT;
BEGIN
    FOR question_record IN
        SELECT "id", COALESCE(NULLIF(TRIM("answer"), ''), 'Correct answer') AS "correctAnswer"
        FROM "Question"
        WHERE "type" = 'short_answer'
    LOOP
        correct_option_text := question_record."correctAnswer";

        IF NOT EXISTS (
            SELECT 1
            FROM "QuestionOption"
            WHERE "questionId" = question_record."id"
        ) THEN
            INSERT INTO "QuestionOption" ("id", "questionId", "optionText", "isCorrect")
            VALUES
                (gen_random_uuid()::text, question_record."id", correct_option_text, TRUE),
                (gen_random_uuid()::text, question_record."id", 'Alternative option 1', FALSE),
                (gen_random_uuid()::text, question_record."id", 'Alternative option 2', FALSE),
                (gen_random_uuid()::text, question_record."id", 'Alternative option 3', FALSE);
        END IF;
    END LOOP;
END $$;

UPDATE "Question"
SET "type" = 'multiple_choice'
WHERE "type" = 'short_answer';

ALTER TYPE "QuestionType" RENAME TO "QuestionType_old";

CREATE TYPE "QuestionType" AS ENUM ('multiple_choice');

ALTER TABLE "Question"
ALTER COLUMN "type" TYPE "QuestionType"
USING ("type"::text::"QuestionType");

DROP TYPE "QuestionType_old";
