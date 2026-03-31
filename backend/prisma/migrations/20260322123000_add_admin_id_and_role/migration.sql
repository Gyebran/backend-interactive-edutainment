DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
        CREATE TYPE "UserRole" AS ENUM ('student', 'admin');
    END IF;
END $$;

ALTER TABLE "User" ADD COLUMN "adminId" TEXT;
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'student';

CREATE UNIQUE INDEX "User_adminId_key" ON "User"("adminId");
