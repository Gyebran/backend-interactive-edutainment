ALTER TABLE "User" ADD COLUMN "studentId" TEXT;
ALTER TABLE "UserSeasonProgress" ADD COLUMN "studentId" TEXT;
ALTER TABLE "UploadData" ADD COLUMN "studentId" TEXT;
ALTER TABLE "QuizAttempt" ADD COLUMN "studentId" TEXT;
ALTER TABLE "Quiz" ADD COLUMN "studentId" TEXT;

UPDATE "User"
SET "studentId" = 'STU-' || REPLACE("id", '-', '')
WHERE "studentId" IS NULL;

UPDATE "UserSeasonProgress" AS usp
SET "studentId" = u."studentId"
FROM "User" AS u
WHERE usp."userId" = u."id"
  AND usp."studentId" IS NULL;

UPDATE "UploadData" AS ud
SET "studentId" = u."studentId"
FROM "User" AS u
WHERE ud."userId" = u."id"
  AND ud."studentId" IS NULL;

UPDATE "QuizAttempt" AS qa
SET "studentId" = u."studentId"
FROM "User" AS u
WHERE qa."userId" = u."id"
  AND qa."studentId" IS NULL;

UPDATE "Quiz" AS q
SET "studentId" = u."studentId"
FROM "UploadData" AS ud
JOIN "User" AS u ON ud."userId" = u."id"
WHERE q."uploadDataId" = ud."id"
  AND q."studentId" IS NULL;

ALTER TABLE "User" ALTER COLUMN "studentId" SET NOT NULL;
ALTER TABLE "UserSeasonProgress" ALTER COLUMN "studentId" SET NOT NULL;
ALTER TABLE "UploadData" ALTER COLUMN "studentId" SET NOT NULL;
ALTER TABLE "QuizAttempt" ALTER COLUMN "studentId" SET NOT NULL;
ALTER TABLE "Quiz" ALTER COLUMN "studentId" SET NOT NULL;

CREATE UNIQUE INDEX "User_studentId_key" ON "User"("studentId");
CREATE INDEX "UserSeasonProgress_studentId_idx" ON "UserSeasonProgress"("studentId");
CREATE INDEX "UploadData_studentId_idx" ON "UploadData"("studentId");
CREATE INDEX "QuizAttempt_studentId_idx" ON "QuizAttempt"("studentId");
CREATE INDEX "Quiz_studentId_idx" ON "Quiz"("studentId");
