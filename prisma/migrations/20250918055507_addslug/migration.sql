/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Posts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Posts` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "api"."Posts_title_content_idx";

-- AlterTable
ALTER TABLE "api"."Posts" ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Posts_slug_key" ON "api"."Posts"("slug");

-- CreateIndex
CREATE INDEX "Posts_title_content_slug_idx" ON "api"."Posts"("title", "content", "slug");
