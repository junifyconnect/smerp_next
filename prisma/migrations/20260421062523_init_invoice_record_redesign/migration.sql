-- CreateEnum
CREATE TYPE "PermissionLevel" AS ENUM ('NONE', 'READ', 'FULL');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('EXCEL_ORIGINAL', 'EXCEL_GENERATED', 'CLIENT_PO', 'ATTACHMENT', 'SIGNED_ORIGINAL');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('DRAFT', 'PENDING', 'PENDING_TEAM_LEAD', 'PENDING_CEO', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'SENT', 'CONFIRMED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPROVAL_REQUEST', 'APPROVAL_APPROVED', 'APPROVAL_REJECTED', 'MA_EXPIRING', 'PAYMENT_DUE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'COMPLETED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PurchaseLedgerType" AS ENUM ('INVOICE', 'CASH', 'CARD', 'IMPORT');

-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('PERSONAL', 'COMPANY', 'MEETING', 'DEADLINE', 'HOLIDAY', 'MA_EXPIRY', 'PAYMENT_DUE');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'HALF_AM', 'HALF_PM', 'SICK', 'FAMILY', 'OFFICIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('APPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'ISSUED', 'NEEDS_AMENDMENT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('SALES', 'PURCHASE');

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "department" TEXT,
    "position" TEXT,
    "role" TEXT,
    "annual_leave" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "additional_leave" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "signature_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" TEXT NOT NULL,
    "role_id" INTEGER NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "user_menu_permissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "menu" TEXT NOT NULL,
    "level" "PermissionLevel" NOT NULL DEFAULT 'NONE',

    CONSTRAINT "user_menu_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "phone" TEXT,
    "fax" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_contacts" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "position" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_quotes" (
    "id" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "project_name" TEXT,
    "product_name" TEXT,
    "manager_name" TEXT,
    "client_company" TEXT,
    "client_contact" TEXT,
    "client_phone" TEXT,
    "client_fax" TEXT,
    "client_mobile" TEXT,
    "client_email" TEXT,
    "total_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_with_vat" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "quote_date" DATE,
    "valid_until" TEXT,
    "delivery_date" DATE,
    "payment_terms" TEXT,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "original_id" TEXT,
    "is_latest" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_quote_products" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(15,2),
    "total_price" DECIMAL(15,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_quote_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_quote_items" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "part_number" TEXT,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(15,2),
    "total_price" DECIMAL(15,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_quote_files" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "file_type" "FileType" NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_quote_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_approvals" (
    "id" TEXT NOT NULL,
    "approval_number" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "source_quote_id" TEXT,
    "approval_code" TEXT,
    "approval_date" DATE,
    "manager_name" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "original_id" TEXT,
    "is_latest" BOOLEAN NOT NULL DEFAULT true,
    "client_company" TEXT,
    "client_contact" TEXT,
    "client_phone" TEXT,
    "end_user" TEXT,
    "total_sales_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_purchase_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "profit_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "payment_terms" TEXT,
    "delivery_address" TEXT,
    "delivery_date" DATE,
    "invoice_email" TEXT,
    "receiver_name" TEXT,
    "receiver_phone" TEXT,
    "notes" TEXT,
    "sales_manager_id" TEXT,
    "sales_manager_signed_at" TIMESTAMP(3),
    "team_leader_id" TEXT,
    "team_leader_signed_at" TIMESTAMP(3),
    "ceo_id" TEXT,
    "ceo_signed_at" TIMESTAMP(3),
    "rejected_by_id" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_approval_products" (
    "id" TEXT NOT NULL,
    "approval_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(15,2),
    "total_price" DECIMAL(15,2),
    "category" TEXT NOT NULL DEFAULT '상품',
    "sub_category" TEXT,
    "tax_type" TEXT NOT NULL DEFAULT 'TAX',
    "sales_invoice_unit" TEXT NOT NULL DEFAULT 'PRODUCT',
    "source_product_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_approval_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_approval_items" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "part_number" TEXT,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sales_unit_price" DECIMAL(15,2),
    "vendor_name" TEXT,
    "purchase_qty" INTEGER NOT NULL DEFAULT 1,
    "purchase_price" DECIMAL(15,2),
    "purchase_total" DECIMAL(15,2),
    "purchase_date" DATE,
    "tax_type" TEXT NOT NULL DEFAULT 'TAX',
    "sales_invoice_required" BOOLEAN NOT NULL DEFAULT true,
    "purchase_invoice_required" BOOLEAN NOT NULL DEFAULT true,
    "source_item_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_approval_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_approval_files" (
    "id" TEXT NOT NULL,
    "approval_id" TEXT NOT NULL,
    "file_type" "FileType" NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_approval_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "order_date" DATE,
    "manager_name" TEXT,
    "manager_phone" TEXT,
    "delivery_address" TEXT,
    "payment_terms" TEXT,
    "vendor_company" TEXT,
    "vendor_contact" TEXT,
    "vendor_phone" TEXT,
    "vendor_email" TEXT,
    "total_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_with_vat" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "original_id" TEXT,
    "is_latest" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_files" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "file_type" "FileType" NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_order_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "part_number" TEXT,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "srp_price" DECIMAL(15,2),
    "unit_price" DECIMAL(15,2),
    "total_price" DECIMAL(15,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ma_quotes" (
    "id" TEXT NOT NULL,
    "quote_number" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "quote_date" DATE,
    "manager_name" TEXT,
    "client_company" TEXT,
    "client_contact" TEXT,
    "total_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_with_vat" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "valid_until" TEXT,
    "payment_terms" TEXT,
    "service_terms" TEXT,
    "special_terms" TEXT,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ma_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ma_quote_items" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "product_name" TEXT,
    "model_type" TEXT,
    "model" TEXT,
    "serial_number" TEXT,
    "service_level" TEXT,
    "period" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "total_price" DECIMAL(15,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ma_quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ma_approvals" (
    "id" TEXT NOT NULL,
    "approval_number" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "approval_date" DATE,
    "manager_name" TEXT,
    "total_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "purchase_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ma_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ma_approval_items" (
    "id" TEXT NOT NULL,
    "approval_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "sm_code" TEXT,
    "vendor_code" TEXT,
    "client_company" TEXT,
    "sales_company" TEXT,
    "sales_price" DECIMAL(15,2),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sales_billing_type" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "purchase_company" TEXT,
    "purchase_price" DECIMAL(15,2),
    "purchase_billing_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ma_approval_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ma_approval_purchase_items" (
    "id" TEXT NOT NULL,
    "approval_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "vendor_company" TEXT,
    "purchase_price" DECIMAL(15,2),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "billing_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ma_approval_purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "excel_imports" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "total_count" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "error_log" JSONB,
    "imported_by" TEXT NOT NULL,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "excel_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link_url" TEXT,
    "link_type" TEXT,
    "related_id" TEXT,
    "related_type" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_ledger" (
    "id" TEXT NOT NULL,
    "approval_code" TEXT,
    "vendor_code" TEXT,
    "transaction_date" DATE NOT NULL,
    "client_company" TEXT NOT NULL,
    "end_user" TEXT,
    "category" TEXT NOT NULL,
    "sub_category" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "supply_amount" DECIMAL(15,2) NOT NULL,
    "vat_amount" DECIMAL(15,2) NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "gross_profit" DECIMAL(15,2),
    "payment_due_date" DATE,
    "payment_date" DATE,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "manager_id" TEXT,
    "manager_name" TEXT,
    "sales_approval_id" TEXT,
    "ma_approval_id" TEXT,
    "source_product_id" TEXT,
    "approval_version" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_ledger" (
    "id" TEXT NOT NULL,
    "approval_code" TEXT,
    "vendor_code" TEXT,
    "invoice_date" DATE NOT NULL,
    "vendor_company" TEXT NOT NULL,
    "client_company" TEXT,
    "category" TEXT NOT NULL,
    "sub_category" TEXT,
    "item_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "supply_amount" DECIMAL(15,2) NOT NULL,
    "vat_amount" DECIMAL(15,2) NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "payment_due_date" DATE,
    "payment_date" DATE,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "ledger_type" "PurchaseLedgerType" NOT NULL DEFAULT 'INVOICE',
    "currency" TEXT,
    "foreign_amount" DECIMAL(15,2),
    "exchange_rate" DECIMAL(10,4),
    "card_number" TEXT,
    "sales_approval_id" TEXT,
    "ma_approval_id" TEXT,
    "source_item_id" TEXT,
    "source_product_id" TEXT,
    "approval_version" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "event_type" "CalendarEventType" NOT NULL DEFAULT 'PERSONAL',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "is_all_day" BOOLEAN NOT NULL DEFAULT false,
    "is_company_wide" BOOLEAN NOT NULL DEFAULT false,
    "user_id" TEXT,
    "related_id" TEXT,
    "related_type" TEXT,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurring_rule" TEXT,
    "color" TEXT,
    "reminder_minutes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_event_participants" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_event_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "leave_type" "LeaveType" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "days" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'APPROVED',
    "deduct_from_annual" BOOLEAN NOT NULL DEFAULT true,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_records" (
    "id" TEXT NOT NULL,
    "approval_id" TEXT NOT NULL,
    "invoice_type" "InvoiceType" NOT NULL,
    "product_id" TEXT,
    "sales_item_id" TEXT,
    "vendor_company" TEXT,
    "client_company" TEXT,
    "product_name" TEXT NOT NULL,
    "part_number" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "total_price" DECIMAL(15,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "invoice_date" DATE,
    "invoice_number" TEXT,
    "remarks" TEXT,
    "amended_from_id" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "excel_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "doc_type" TEXT NOT NULL,
    "sample_file_name" TEXT,
    "sample_file_path" TEXT,
    "field_mappings" JSONB NOT NULL DEFAULT '{}',
    "item_table_header_row" INTEGER NOT NULL DEFAULT 16,
    "item_table_start_row" INTEGER NOT NULL DEFAULT 17,
    "item_table_end_row" INTEGER,
    "sales_column_mappings" JSONB NOT NULL DEFAULT '{}',
    "purchase_column_mappings" JSONB NOT NULL DEFAULT '{}',
    "main_item_detection" TEXT,
    "sub_item_detection" TEXT,
    "total_row_detection" TEXT,
    "analyzed_data" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "excel_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "user_menu_permissions_user_id_idx" ON "user_menu_permissions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_menu_permissions_user_id_menu_key" ON "user_menu_permissions"("user_id", "menu");

-- CreateIndex
CREATE UNIQUE INDEX "customers_company_name_key" ON "customers"("company_name");

-- CreateIndex
CREATE INDEX "customers_company_name_idx" ON "customers"("company_name");

-- CreateIndex
CREATE INDEX "customers_is_active_idx" ON "customers"("is_active");

-- CreateIndex
CREATE INDEX "customer_contacts_customer_id_idx" ON "customer_contacts"("customer_id");

-- CreateIndex
CREATE INDEX "customer_contacts_is_active_idx" ON "customer_contacts"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_name_key" ON "vendors"("name");

-- CreateIndex
CREATE INDEX "vendors_name_idx" ON "vendors"("name");

-- CreateIndex
CREATE INDEX "vendors_usage_count_idx" ON "vendors"("usage_count" DESC);

-- CreateIndex
CREATE INDEX "vendors_is_active_idx" ON "vendors"("is_active");

-- CreateIndex
CREATE INDEX "sales_quotes_status_idx" ON "sales_quotes"("status");

-- CreateIndex
CREATE INDEX "sales_quotes_is_latest_idx" ON "sales_quotes"("is_latest");

-- CreateIndex
CREATE INDEX "sales_quotes_created_by_idx" ON "sales_quotes"("created_by");

-- CreateIndex
CREATE INDEX "sales_quotes_client_company_idx" ON "sales_quotes"("client_company");

-- CreateIndex
CREATE INDEX "sales_quotes_quote_date_idx" ON "sales_quotes"("quote_date" DESC);

-- CreateIndex
CREATE INDEX "sales_quotes_created_at_idx" ON "sales_quotes"("created_at" DESC);

-- CreateIndex
CREATE INDEX "sales_quote_products_quote_id_idx" ON "sales_quote_products"("quote_id");

-- CreateIndex
CREATE INDEX "sales_quote_items_product_id_idx" ON "sales_quote_items"("product_id");

-- CreateIndex
CREATE INDEX "sales_quote_files_quote_id_idx" ON "sales_quote_files"("quote_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_approvals_approval_number_key" ON "sales_approvals"("approval_number");

-- CreateIndex
CREATE INDEX "sales_approvals_status_idx" ON "sales_approvals"("status");

-- CreateIndex
CREATE INDEX "sales_approvals_created_by_idx" ON "sales_approvals"("created_by");

-- CreateIndex
CREATE INDEX "sales_approvals_sales_manager_id_idx" ON "sales_approvals"("sales_manager_id");

-- CreateIndex
CREATE INDEX "sales_approvals_team_leader_id_idx" ON "sales_approvals"("team_leader_id");

-- CreateIndex
CREATE INDEX "sales_approvals_ceo_id_idx" ON "sales_approvals"("ceo_id");

-- CreateIndex
CREATE INDEX "sales_approvals_created_at_idx" ON "sales_approvals"("created_at" DESC);

-- CreateIndex
CREATE INDEX "sales_approvals_approval_code_idx" ON "sales_approvals"("approval_code");

-- CreateIndex
CREATE INDEX "sales_approvals_is_latest_idx" ON "sales_approvals"("is_latest");

-- CreateIndex
CREATE INDEX "sales_approvals_original_id_idx" ON "sales_approvals"("original_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_approvals_approval_code_version_key" ON "sales_approvals"("approval_code", "version");

-- CreateIndex
CREATE INDEX "sales_approval_products_approval_id_idx" ON "sales_approval_products"("approval_id");

-- CreateIndex
CREATE INDEX "sales_approval_products_source_product_id_idx" ON "sales_approval_products"("source_product_id");

-- CreateIndex
CREATE INDEX "sales_approval_items_product_id_idx" ON "sales_approval_items"("product_id");

-- CreateIndex
CREATE INDEX "sales_approval_items_vendor_name_idx" ON "sales_approval_items"("vendor_name");

-- CreateIndex
CREATE INDEX "sales_approval_items_source_item_id_idx" ON "sales_approval_items"("source_item_id");

-- CreateIndex
CREATE INDEX "sales_approval_files_approval_id_idx" ON "sales_approval_files"("approval_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_order_number_key" ON "sales_orders"("order_number");

-- CreateIndex
CREATE INDEX "sales_orders_status_idx" ON "sales_orders"("status");

-- CreateIndex
CREATE INDEX "sales_orders_created_by_idx" ON "sales_orders"("created_by");

-- CreateIndex
CREATE INDEX "sales_orders_is_latest_idx" ON "sales_orders"("is_latest");

-- CreateIndex
CREATE INDEX "sales_orders_created_at_idx" ON "sales_orders"("created_at" DESC);

-- CreateIndex
CREATE INDEX "sales_order_files_order_id_idx" ON "sales_order_files"("order_id");

-- CreateIndex
CREATE INDEX "sales_order_items_order_id_idx" ON "sales_order_items"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "ma_quotes_quote_number_key" ON "ma_quotes"("quote_number");

-- CreateIndex
CREATE INDEX "ma_quotes_status_idx" ON "ma_quotes"("status");

-- CreateIndex
CREATE INDEX "ma_quotes_created_by_idx" ON "ma_quotes"("created_by");

-- CreateIndex
CREATE INDEX "ma_quotes_created_at_idx" ON "ma_quotes"("created_at" DESC);

-- CreateIndex
CREATE INDEX "ma_quote_items_quote_id_idx" ON "ma_quote_items"("quote_id");

-- CreateIndex
CREATE UNIQUE INDEX "ma_approvals_approval_number_key" ON "ma_approvals"("approval_number");

-- CreateIndex
CREATE INDEX "ma_approvals_status_idx" ON "ma_approvals"("status");

-- CreateIndex
CREATE INDEX "ma_approvals_created_by_idx" ON "ma_approvals"("created_by");

-- CreateIndex
CREATE INDEX "ma_approvals_created_at_idx" ON "ma_approvals"("created_at" DESC);

-- CreateIndex
CREATE INDEX "ma_approval_items_approval_id_idx" ON "ma_approval_items"("approval_id");

-- CreateIndex
CREATE INDEX "ma_approval_purchase_items_approval_id_idx" ON "ma_approval_purchase_items"("approval_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "sales_ledger_transaction_date_idx" ON "sales_ledger"("transaction_date");

-- CreateIndex
CREATE INDEX "sales_ledger_client_company_idx" ON "sales_ledger"("client_company");

-- CreateIndex
CREATE INDEX "sales_ledger_category_idx" ON "sales_ledger"("category");

-- CreateIndex
CREATE INDEX "sales_ledger_payment_status_idx" ON "sales_ledger"("payment_status");

-- CreateIndex
CREATE INDEX "sales_ledger_payment_due_date_idx" ON "sales_ledger"("payment_due_date");

-- CreateIndex
CREATE INDEX "sales_ledger_manager_name_idx" ON "sales_ledger"("manager_name");

-- CreateIndex
CREATE INDEX "sales_ledger_approval_code_idx" ON "sales_ledger"("approval_code");

-- CreateIndex
CREATE INDEX "sales_ledger_is_active_idx" ON "sales_ledger"("is_active");

-- CreateIndex
CREATE INDEX "purchase_ledger_invoice_date_idx" ON "purchase_ledger"("invoice_date");

-- CreateIndex
CREATE INDEX "purchase_ledger_vendor_company_idx" ON "purchase_ledger"("vendor_company");

-- CreateIndex
CREATE INDEX "purchase_ledger_client_company_idx" ON "purchase_ledger"("client_company");

-- CreateIndex
CREATE INDEX "purchase_ledger_category_idx" ON "purchase_ledger"("category");

-- CreateIndex
CREATE INDEX "purchase_ledger_payment_status_idx" ON "purchase_ledger"("payment_status");

-- CreateIndex
CREATE INDEX "purchase_ledger_payment_due_date_idx" ON "purchase_ledger"("payment_due_date");

-- CreateIndex
CREATE INDEX "purchase_ledger_ledger_type_idx" ON "purchase_ledger"("ledger_type");

-- CreateIndex
CREATE INDEX "purchase_ledger_approval_code_idx" ON "purchase_ledger"("approval_code");

-- CreateIndex
CREATE INDEX "purchase_ledger_is_active_idx" ON "purchase_ledger"("is_active");

-- CreateIndex
CREATE INDEX "calendar_events_user_id_start_date_idx" ON "calendar_events"("user_id", "start_date");

-- CreateIndex
CREATE INDEX "calendar_events_is_company_wide_start_date_idx" ON "calendar_events"("is_company_wide", "start_date");

-- CreateIndex
CREATE INDEX "calendar_events_event_type_idx" ON "calendar_events"("event_type");

-- CreateIndex
CREATE INDEX "calendar_events_start_date_idx" ON "calendar_events"("start_date");

-- CreateIndex
CREATE INDEX "calendar_event_participants_user_id_idx" ON "calendar_event_participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_event_participants_event_id_user_id_key" ON "calendar_event_participants"("event_id", "user_id");

-- CreateIndex
CREATE INDEX "leave_requests_user_id_idx" ON "leave_requests"("user_id");

-- CreateIndex
CREATE INDEX "leave_requests_start_date_idx" ON "leave_requests"("start_date");

-- CreateIndex
CREATE INDEX "leave_requests_status_idx" ON "leave_requests"("status");

-- CreateIndex
CREATE INDEX "leave_requests_leave_type_idx" ON "leave_requests"("leave_type");

-- CreateIndex
CREATE INDEX "invoice_records_approval_id_invoice_type_idx" ON "invoice_records"("approval_id", "invoice_type");

-- CreateIndex
CREATE INDEX "invoice_records_approval_id_product_id_idx" ON "invoice_records"("approval_id", "product_id");

-- CreateIndex
CREATE INDEX "invoice_records_approval_id_vendor_company_idx" ON "invoice_records"("approval_id", "vendor_company");

-- CreateIndex
CREATE INDEX "invoice_records_amended_from_id_idx" ON "invoice_records"("amended_from_id");

-- CreateIndex
CREATE INDEX "invoice_records_status_idx" ON "invoice_records"("status");

-- CreateIndex
CREATE INDEX "excel_templates_doc_type_idx" ON "excel_templates"("doc_type");

-- CreateIndex
CREATE INDEX "excel_templates_is_active_idx" ON "excel_templates"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "unique_default_per_doctype" ON "excel_templates"("doc_type", "is_default");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_menu_permissions" ADD CONSTRAINT "user_menu_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_quotes" ADD CONSTRAINT "sales_quotes_original_id_fkey" FOREIGN KEY ("original_id") REFERENCES "sales_quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_quotes" ADD CONSTRAINT "sales_quotes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_quote_products" ADD CONSTRAINT "sales_quote_products_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "sales_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_quote_items" ADD CONSTRAINT "sales_quote_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "sales_quote_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_quote_files" ADD CONSTRAINT "sales_quote_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_quote_files" ADD CONSTRAINT "sales_quote_files_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "sales_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_approvals" ADD CONSTRAINT "sales_approvals_source_quote_id_fkey" FOREIGN KEY ("source_quote_id") REFERENCES "sales_quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_approvals" ADD CONSTRAINT "sales_approvals_original_id_fkey" FOREIGN KEY ("original_id") REFERENCES "sales_approvals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_approvals" ADD CONSTRAINT "sales_approvals_sales_manager_id_fkey" FOREIGN KEY ("sales_manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_approvals" ADD CONSTRAINT "sales_approvals_team_leader_id_fkey" FOREIGN KEY ("team_leader_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_approvals" ADD CONSTRAINT "sales_approvals_ceo_id_fkey" FOREIGN KEY ("ceo_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_approvals" ADD CONSTRAINT "sales_approvals_rejected_by_id_fkey" FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_approval_products" ADD CONSTRAINT "sales_approval_products_approval_id_fkey" FOREIGN KEY ("approval_id") REFERENCES "sales_approvals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_approval_items" ADD CONSTRAINT "sales_approval_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "sales_approval_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_approval_files" ADD CONSTRAINT "sales_approval_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_approval_files" ADD CONSTRAINT "sales_approval_files_approval_id_fkey" FOREIGN KEY ("approval_id") REFERENCES "sales_approvals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_original_id_fkey" FOREIGN KEY ("original_id") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_files" ADD CONSTRAINT "sales_order_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_files" ADD CONSTRAINT "sales_order_files_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ma_quote_items" ADD CONSTRAINT "ma_quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "ma_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ma_approval_items" ADD CONSTRAINT "ma_approval_items_approval_id_fkey" FOREIGN KEY ("approval_id") REFERENCES "ma_approvals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ma_approval_purchase_items" ADD CONSTRAINT "ma_approval_purchase_items_approval_id_fkey" FOREIGN KEY ("approval_id") REFERENCES "ma_approvals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "excel_imports" ADD CONSTRAINT "excel_imports_imported_by_fkey" FOREIGN KEY ("imported_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_participants" ADD CONSTRAINT "calendar_event_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_participants" ADD CONSTRAINT "calendar_event_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_records" ADD CONSTRAINT "invoice_records_approval_id_fkey" FOREIGN KEY ("approval_id") REFERENCES "sales_approvals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_records" ADD CONSTRAINT "invoice_records_amended_from_id_fkey" FOREIGN KEY ("amended_from_id") REFERENCES "invoice_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
