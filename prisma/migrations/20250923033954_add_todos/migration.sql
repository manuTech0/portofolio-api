/*
  Warnings:

  - The primary key for the `Todos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Todos` table. All the data in the column will be lost.
  - The required column `todosId` was added to the `Todos` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "api"."Todos" DROP CONSTRAINT "Todos_pkey",
DROP COLUMN "id",
ADD COLUMN     "todosId" TEXT NOT NULL,
ADD CONSTRAINT "Todos_pkey" PRIMARY KEY ("todosId");
