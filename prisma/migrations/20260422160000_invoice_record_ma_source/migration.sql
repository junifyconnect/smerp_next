-- CreateEnum
CREATE TYPE "InvoiceSource" AS ENUM ('SALES_APPROVAL', 'MA_BILLING');

-- AlterTable
ALTER TABLE "invoice_records" ADD COLUMN     "ma_billing_id" TEXT,
ADD COLUMN     "source" "InvoiceSource" NOT NULL DEFAULT 'SALES_APPROVAL',
ALTER COLUMN "approval_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "invoice_records_source_idx" ON "invoice_records"("source");

-- CreateIndex
CREATE INDEX "invoice_records_ma_billing_id_idx" ON "invoice_records"("ma_billing_id");

-- AddForeignKey
ALTER TABLE "invoice_records" ADD CONSTRAINT "invoice_records_ma_billing_id_fkey" FOREIGN KEY ("ma_billing_id") REFERENCES "ma_billings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

