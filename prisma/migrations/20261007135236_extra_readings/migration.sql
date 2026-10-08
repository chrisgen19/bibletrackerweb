-- Extra readings: logged on their day and counted toward the streak, but never part of
-- the plan's chapter progress. Every existing row stays a plan reading.

-- AlterTable
ALTER TABLE "reading_completion" ADD COLUMN     "is_extra" BOOLEAN NOT NULL DEFAULT false;
