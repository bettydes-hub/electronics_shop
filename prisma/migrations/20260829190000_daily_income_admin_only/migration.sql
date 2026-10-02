-- Admin-only shop: DailyIncome ledger + promote all staff to ADMIN
CREATE TABLE IF NOT EXISTS "DailyIncome" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyIncome_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DailyIncome_date_idx" ON "DailyIncome"("date");

UPDATE "User" SET "role" = 'ADMIN' WHERE "role" IN ('OWNER', 'SELLER');
