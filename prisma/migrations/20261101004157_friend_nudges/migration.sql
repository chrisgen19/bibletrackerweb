-- CreateTable
CREATE TABLE "friend_nudge" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "friendship_id" UUID NOT NULL,
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "local_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissed_at" TIMESTAMPTZ(3),

    CONSTRAINT "friend_nudge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "friend_nudge_receiver_id_dismissed_at_idx" ON "friend_nudge"("receiver_id", "dismissed_at");

-- CreateIndex
CREATE UNIQUE INDEX "friend_nudge_sender_id_receiver_id_local_date_key" ON "friend_nudge"("sender_id", "receiver_id", "local_date");

-- AddForeignKey
ALTER TABLE "friend_nudge" ADD CONSTRAINT "friend_nudge_friendship_id_fkey" FOREIGN KEY ("friendship_id") REFERENCES "friendship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friend_nudge" ADD CONSTRAINT "friend_nudge_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friend_nudge" ADD CONSTRAINT "friend_nudge_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written, as in the init migration: Prisma cannot express CHECK constraints.
ALTER TABLE "friend_nudge"
  ADD CONSTRAINT "friend_nudge_not_self" CHECK ("sender_id" <> "receiver_id");
