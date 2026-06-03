ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'KOKO';

ALTER TABLE "Invoice" ADD COLUMN "preferredPaymentMethod" "PaymentMethod";
