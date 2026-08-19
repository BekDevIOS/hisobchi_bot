CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "Currency" AS ENUM ('UZS', 'KRW', 'USD');
CREATE TYPE "AccountType" AS ENUM ('CASH', 'CARD', 'BANK', 'SAVINGS', 'OTHER');
CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');
CREATE TYPE "TransactionSource" AS ENUM ('BOT', 'WEB', 'AI', 'SYSTEM');

CREATE TABLE "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "telegramId" TEXT NOT NULL, "username" TEXT, "firstName" TEXT NOT NULL, "lastName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

CREATE TABLE "UserSettings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "userId" UUID NOT NULL, "defaultCurrency" "Currency" NOT NULL DEFAULT 'UZS', "language" TEXT NOT NULL DEFAULT 'uz', "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

CREATE TABLE "Account" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "userId" UUID NOT NULL, "name" TEXT NOT NULL, "type" "AccountType" NOT NULL DEFAULT 'CASH', "currency" "Currency" NOT NULL, "initialBalance" DECIMAL(20,4) NOT NULL DEFAULT 0, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Account_userId_isActive_idx" ON "Account"("userId", "isActive");

CREATE TABLE "Category" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "userId" UUID, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "icon" TEXT NOT NULL, "type" "CategoryType" NOT NULL, "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Category_type_isSystem_idx" ON "Category"("type", "isSystem");
CREATE INDEX "Category_userId_slug_type_idx" ON "Category"("userId", "slug", "type");

CREATE TABLE "Transaction" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "userId" UUID NOT NULL, "accountId" UUID NOT NULL, "categoryId" UUID NOT NULL, "type" "TransactionType" NOT NULL, "amount" DECIMAL(20,4) NOT NULL, "currency" "Currency" NOT NULL, "description" TEXT NOT NULL, "transactionDate" TIMESTAMP(3) NOT NULL, "source" "TransactionSource" NOT NULL DEFAULT 'WEB',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Transaction_userId_transactionDate_idx" ON "Transaction"("userId", "transactionDate");
CREATE INDEX "Transaction_accountId_transactionDate_idx" ON "Transaction"("accountId", "transactionDate");
CREATE INDEX "Transaction_userId_type_idx" ON "Transaction"("userId", "type");

ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
