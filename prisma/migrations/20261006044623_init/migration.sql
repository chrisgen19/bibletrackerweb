-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_plan" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "canon_id" TEXT NOT NULL DEFAULT 'protestant',
    "start_date" DATE NOT NULL,
    "start_book_id" TEXT NOT NULL,
    "start_chapter" INTEGER NOT NULL,
    "chapters_per_day" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "end_date" DATE,

    CONSTRAINT "reading_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_completion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "reading_plan_id" UUID NOT NULL,
    "local_date" DATE NOT NULL,
    "book_id" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "from_verse" INTEGER NOT NULL DEFAULT 0,
    "to_verse" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMPTZ(3) NOT NULL,
    "seq" BIGSERIAL NOT NULL,

    CONSTRAINT "reading_completion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_setting" (
    "user_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_setting_pkey" PRIMARY KEY ("user_id","key")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "reading_plan_user_id_start_date_idx" ON "reading_plan"("user_id", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "reading_plan_id_user_id_key" ON "reading_plan"("id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "reading_plan_one_open_per_user" ON "reading_plan"("user_id") WHERE ("is_active" = true AND "end_date" IS NULL);

-- CreateIndex
CREATE INDEX "reading_completion_user_id_local_date_idx" ON "reading_completion"("user_id", "local_date");

-- CreateIndex
CREATE UNIQUE INDEX "reading_completion_day_span_unique" ON "reading_completion"("user_id", "local_date", "book_id", "chapter", "from_verse", "to_verse");

-- AddForeignKey
ALTER TABLE "reading_plan" ADD CONSTRAINT "reading_plan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_completion" ADD CONSTRAINT "reading_completion_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_completion" ADD CONSTRAINT "reading_completion_reading_plan_id_user_id_fkey" FOREIGN KEY ("reading_plan_id", "user_id") REFERENCES "reading_plan"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_setting" ADD CONSTRAINT "app_setting_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CHECK constraints (hand-written: Prisma cannot express these, and leaves them alone
-- when diffing). They hold the same invariants the iOS app's domain code assumes.

-- A plan starts on a real chapter, reads 1 to 10 chapters a day (plan-draft.ts), and
-- an active plan is always open-ended: closing a segment sets is_active = false.
ALTER TABLE "reading_plan"
  ADD CONSTRAINT "reading_plan_start_chapter_positive" CHECK ("start_chapter" >= 1),
  ADD CONSTRAINT "reading_plan_chapters_per_day_range" CHECK ("chapters_per_day" BETWEEN 1 AND 10),
  ADD CONSTRAINT "reading_plan_active_is_open" CHECK (NOT "is_active" OR "end_date" IS NULL);

-- A verse span is either the legacy 0,0 "whole chapter" sentinel or a real, ordered
-- span starting at verse 1 or later. A reversed span is unrepresentable.
ALTER TABLE "reading_completion"
  ADD CONSTRAINT "reading_completion_chapter_positive" CHECK ("chapter" >= 1),
  ADD CONSTRAINT "reading_completion_span_valid" CHECK (
    ("from_verse" = 0 AND "to_verse" = 0)
    OR ("from_verse" >= 1 AND "from_verse" <= "to_verse")
  );
