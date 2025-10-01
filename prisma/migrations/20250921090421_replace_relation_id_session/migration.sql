-- DropForeignKey
ALTER TABLE "api"."Session" DROP CONSTRAINT "Session_userId_fkey";

-- AlterTable
ALTER TABLE "api"."Users" ALTER COLUMN "role" SET DEFAULT 'user';

-- AddForeignKey
ALTER TABLE "api"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "api"."Users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
