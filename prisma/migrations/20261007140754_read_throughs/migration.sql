-- Read-throughs: every plan segment belongs to a numbered time through the Bible. Every
-- existing segment is the first.

-- AlterTable
ALTER TABLE "reading_plan" ADD COLUMN     "read_through" INTEGER NOT NULL DEFAULT 1;

-- Hand-written, as in the init migration: Prisma cannot express CHECK constraints.
ALTER TABLE "reading_plan"
  ADD CONSTRAINT "reading_plan_read_through_positive" CHECK ("read_through" >= 1);
