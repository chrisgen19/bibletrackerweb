-- CreateIndex
CREATE INDEX "friendship_requested_by_id_status_idx" ON "friendship"("requested_by_id", "status");
