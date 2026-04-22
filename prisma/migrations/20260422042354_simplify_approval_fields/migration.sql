/*
  Warnings:

  - You are about to drop the column `sales_item_id` on the `invoice_records` table. All the data in the column will be lost.
  - You are about to drop the column `tax_type` on the `sales_approval_items` table. All the data in the column will be lost.
  - You are about to drop the column `sales_invoice_unit` on the `sales_approval_products` table. All the data in the column will be lost.
  - You are about to drop the column `tax_type` on the `sales_approval_products` table. All the data in the column will be lost.
  - The `category` column on the `sales_approval_products` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `category` on the `purchase_ledger` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `category` on the `sales_ledger` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('상품', 'MA');

-- AlterTable
ALTER TABLE "invoice_records" DROP COLUMN "sales_item_id";

-- AlterTable
ALTER TABLE "purchase_ledger" DROP COLUMN "category",
ADD COLUMN     "category" "ProductCategory" NOT NULL;

-- AlterTable
ALTER TABLE "sales_approval_items" DROP COLUMN "tax_type";

-- AlterTable
ALTER TABLE "sales_approval_products" DROP COLUMN "sales_invoice_unit",
DROP COLUMN "tax_type",
DROP COLUMN "category",
ADD COLUMN     "category" "ProductCategory" NOT NULL DEFAULT '상품';

-- AlterTable
ALTER TABLE "sales_ledger" DROP COLUMN "category",
ADD COLUMN     "category" "ProductCategory" NOT NULL;

-- CreateIndex
CREATE INDEX "purchase_ledger_category_idx" ON "purchase_ledger"("category");

-- CreateIndex
CREATE INDEX "sales_ledger_category_idx" ON "sales_ledger"("category");
