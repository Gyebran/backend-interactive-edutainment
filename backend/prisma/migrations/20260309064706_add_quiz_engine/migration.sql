-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('multiple_choice', 'short_answer');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('easy', 'medium', 'hard');

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "uploadDataId" TEXT NOT NULL,
    "descriptionHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "questionText" TEXT NOT NULL,
    "answer" TEXT,
    "explanation" TEXT,
    "difficulty" "DifficultyLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionText" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Quiz_uploadDataId_idx" ON "Quiz"("uploadDataId");

-- CreateIndex
CREATE INDEX "Quiz_descriptionHash_idx" ON "Quiz"("descriptionHash");

-- CreateIndex
CREATE INDEX "Question_quizId_idx" ON "Question"("quizId");

-- CreateIndex
CREATE INDEX "QuestionOption_questionId_idx" ON "QuestionOption"("questionId");

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_uploadDataId_fkey" FOREIGN KEY ("uploadDataId") REFERENCES "UploadData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
