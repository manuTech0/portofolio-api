/*
  Warnings:

  - A unique constraint covering the columns `[uniqueId]` on the table `Users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "uniqueId" TEXT NOT NULL DEFAULT 'U' || to_char(CURRENT_TIMESTAMP, 'YYMMDDHH24MISS') || substr(md5(random()::text), 1, 3);

-- CreateIndex
CREATE UNIQUE INDEX "Users_uniqueId_key" ON "Users"("uniqueId");
