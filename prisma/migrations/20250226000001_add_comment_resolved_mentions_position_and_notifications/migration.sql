-- AlterTable
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "resolved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "positionX" DOUBLE PRECISION;
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "positionY" DOUBLE PRECISION;
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "mentionUserIds" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Notification_userId_fkey'
  ) THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
