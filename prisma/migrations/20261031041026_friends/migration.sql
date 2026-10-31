-- CreateEnum
CREATE TYPE "friendship_status" AS ENUM ('pending', 'accepted');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "username" TEXT;

-- CreateTable
CREATE TABLE "friend_invite" (
    "user_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "friend_invite_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "friendship" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_a_id" TEXT NOT NULL,
    "user_b_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "status" "friendship_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMPTZ(3),

    CONSTRAINT "friendship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "friend_invite_code_key" ON "friend_invite"("code");

-- CreateIndex
CREATE INDEX "friendship_user_b_id_idx" ON "friendship"("user_b_id");

-- CreateIndex
CREATE UNIQUE INDEX "friendship_user_a_id_user_b_id_key" ON "friendship"("user_a_id", "user_b_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- AddForeignKey
ALTER TABLE "friend_invite" ADD CONSTRAINT "friend_invite_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_user_a_id_fkey" FOREIGN KEY ("user_a_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_user_b_id_fkey" FOREIGN KEY ("user_b_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written, as in the init migration: Prisma cannot express CHECK constraints.
ALTER TABLE "user"
  ADD CONSTRAINT "user_username_format" CHECK ("username" ~ '^[a-z0-9_]{3,20}$');
ALTER TABLE "friend_invite"
  ADD CONSTRAINT "friend_invite_code_format" CHECK ("code" ~ '^[A-Za-z0-9]{10}$');
ALTER TABLE "friendship"
  ADD CONSTRAINT "friendship_pair_ordered" CHECK ("user_a_id" < "user_b_id" COLLATE "C"),
  ADD CONSTRAINT "friendship_requester_in_pair" CHECK ("requested_by_id" IN ("user_a_id", "user_b_id")),
  ADD CONSTRAINT "friendship_accepted_at_matches" CHECK (("status" = 'accepted') = ("accepted_at" IS NOT NULL));
