-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('매월', '격월', '분기', '반기', '연간', '일시불');

-- AlterTable
ALTER TABLE "ma_approval_items" DROP COLUMN "purchase_billing_type",
DROP COLUMN "sales_billing_type",
ADD COLUMN     "billing_day_of_month" INTEGER NOT NULL DEFAULT 31,
ADD COLUMN     "purchase_billing_cycle" "BillingCycle",
ADD COLUMN     "sales_billing_cycle" "BillingCycle";

-- AlterTable
ALTER TABLE "ma_approvals" ADD COLUMN     "approval_code" TEXT,
ADD COLUMN     "ceo_id" TEXT,
ADD COLUMN     "ceo_signed_at" TIMESTAMP(3),
ADD COLUMN     "is_latest" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "original_id" TEXT,
ADD COLUMN     "rejected_at" TIMESTAMP(3),
ADD COLUMN     "rejected_by_id" TEXT,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "sales_manager_id" TEXT,
ADD COLUMN     "sales_manager_signed_at" TIMESTAMP(3),
ADD COLUMN     "team_leader_id" TEXT,
ADD COLUMN     "team_leader_signed_at" TIMESTAMP(3),
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "ma_contracts" (
    "id" TEXT NOT NULL,
    "ma_approval_id" TEXT NOT NULL,
    "root_approval_id" TEXT NOT NULL,
    "approval_version" INTEGER NOT NULL DEFAULT 1,
    "client_company" TEXT NOT NULL,
    "contract_start_date" DATE NOT NULL,
    "contract_end_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ma_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ma_billings" (
    "id" TEXT NOT NULL,
    "ma_contract_id" TEXT NOT NULL,
    "billing_month" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "sales_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "purchase_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "sales_vat_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "purchase_vat_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "sales_total_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "purchase_total_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "client_company" TEXT NOT NULL,
    "vendor_company" TEXT,
    "item_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "source_item_id" TEXT,
    "approval_version" INTEGER,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "payment_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ma_billings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ma_contracts_ma_approval_id_idx" ON "ma_contracts"("ma_approval_id");

-- CreateIndex
CREATE INDEX "ma_contracts_root_approval_id_idx" ON "ma_contracts"("root_approval_id");

-- CreateIndex
CREATE INDEX "ma_contracts_is_active_idx" ON "ma_contracts"("is_active");

-- CreateIndex
CREATE INDEX "ma_billings_ma_contract_id_idx" ON "ma_billings"("ma_contract_id");

-- CreateIndex
CREATE INDEX "ma_billings_billing_month_idx" ON "ma_billings"("billing_month");

-- CreateIndex
CREATE INDEX "ma_billings_due_date_idx" ON "ma_billings"("due_date");

-- CreateIndex
CREATE INDEX "ma_billings_client_company_idx" ON "ma_billings"("client_company");

-- CreateIndex
CREATE INDEX "ma_billings_vendor_company_idx" ON "ma_billings"("vendor_company");

-- CreateIndex
CREATE INDEX "ma_billings_payment_status_idx" ON "ma_billings"("payment_status");

-- CreateIndex
CREATE INDEX "ma_billings_is_active_idx" ON "ma_billings"("is_active");

-- CreateIndex
CREATE INDEX "ma_approvals_sales_manager_id_idx" ON "ma_approvals"("sales_manager_id");

-- CreateIndex
CREATE INDEX "ma_approvals_team_leader_id_idx" ON "ma_approvals"("team_leader_id");

-- CreateIndex
CREATE INDEX "ma_approvals_ceo_id_idx" ON "ma_approvals"("ceo_id");

-- CreateIndex
CREATE INDEX "ma_approvals_approval_code_idx" ON "ma_approvals"("approval_code");

-- CreateIndex
CREATE INDEX "ma_approvals_is_latest_idx" ON "ma_approvals"("is_latest");

-- CreateIndex
CREATE INDEX "ma_approvals_original_id_idx" ON "ma_approvals"("original_id");

-- CreateIndex
CREATE UNIQUE INDEX "ma_approvals_approval_code_version_key" ON "ma_approvals"("approval_code", "version");

-- AddForeignKey
ALTER TABLE "ma_approvals" ADD CONSTRAINT "ma_approvals_original_id_fkey" FOREIGN KEY ("original_id") REFERENCES "ma_approvals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ma_approvals" ADD CONSTRAINT "ma_approvals_sales_manager_id_fkey" FOREIGN KEY ("sales_manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ma_approvals" ADD CONSTRAINT "ma_approvals_team_leader_id_fkey" FOREIGN KEY ("team_leader_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ma_approvals" ADD CONSTRAINT "ma_approvals_ceo_id_fkey" FOREIGN KEY ("ceo_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ma_approvals" ADD CONSTRAINT "ma_approvals_rejected_by_id_fkey" FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ma_contracts" ADD CONSTRAINT "ma_contracts_ma_approval_id_fkey" FOREIGN KEY ("ma_approval_id") REFERENCES "ma_approvals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ma_billings" ADD CONSTRAINT "ma_billings_ma_contract_id_fkey" FOREIGN KEY ("ma_contract_id") REFERENCES "ma_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

