-- Rename Customer.company_name -> name
-- Migration strategy: RENAME column + drop/create index (preserves data)

-- Drop old index and unique constraint
DROP INDEX IF EXISTS "customers_company_name_key";
DROP INDEX IF EXISTS "customers_company_name_idx";

-- Rename column
ALTER TABLE "customers" RENAME COLUMN "company_name" TO "name";

-- Recreate index and unique constraint on new column name
CREATE UNIQUE INDEX "customers_name_key" ON "customers"("name");
CREATE INDEX "customers_name_idx" ON "customers"("name");
