-- Add expense date for P&L attribution; backfill from createdAt
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "date" DATE;

UPDATE "Expense"
SET "date" = DATE("createdAt")
WHERE "date" IS NULL;

ALTER TABLE "Expense" ALTER COLUMN "date" SET NOT NULL;
ALTER TABLE "Expense" ALTER COLUMN "date" SET DEFAULT CURRENT_DATE;

CREATE INDEX IF NOT EXISTS "Expense_date_idx" ON "Expense"("date");
