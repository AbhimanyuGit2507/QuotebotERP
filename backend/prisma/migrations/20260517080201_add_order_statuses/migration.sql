-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PurchaseOrderStatus" ADD VALUE 'INVOICE_SENT';
ALTER TYPE "PurchaseOrderStatus" ADD VALUE 'PAYMENT_PENDING';
ALTER TYPE "PurchaseOrderStatus" ADD VALUE 'PAID';
ALTER TYPE "PurchaseOrderStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "PurchaseOrderStatus" ADD VALUE 'CANCELLED';
