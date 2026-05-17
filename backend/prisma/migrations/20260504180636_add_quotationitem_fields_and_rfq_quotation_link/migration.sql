/*
  Warnings:

  - A unique constraint covering the columns `[quotation_id]` on the table `RFQ` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "QuotationItem" ADD COLUMN     "availability" TEXT,
ADD COLUMN     "available_quantity" DOUBLE PRECISION,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "RFQ" ADD COLUMN     "quotation_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RFQ_quotation_id_key" ON "RFQ"("quotation_id");

-- AddForeignKey
ALTER TABLE "RFQ" ADD CONSTRAINT "RFQ_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
