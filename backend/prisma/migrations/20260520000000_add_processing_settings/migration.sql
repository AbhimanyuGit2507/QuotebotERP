-- CreateTable
CREATE TABLE "ProcessingSettings" (
    "id" TEXT NOT NULL,
    "interval_ms" INTEGER NOT NULL DEFAULT 20000,
    "run_batch_limit" INTEGER NOT NULL DEFAULT 60,
    "classifier_batch_size" INTEGER NOT NULL DEFAULT 8,
    "classifier_batch_max_bytes" INTEGER NOT NULL DEFAULT 26000,
    "extraction_delay_ms" INTEGER NOT NULL DEFAULT 50,
    "llm_rate_limit_per_minute" INTEGER NOT NULL DEFAULT 10,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessingSettings_pkey" PRIMARY KEY ("id")
);