-- CreateEnum
CREATE TYPE "api"."PostStatus" AS ENUM ('public', 'private', 'deleted', 'draft');

-- CreateEnum
CREATE TYPE "api"."UserStatus" AS ENUM ('deleted', 'banded');

-- CreateEnum
CREATE TYPE "api"."UsersRoles" AS ENUM ('user', 'admin');

-- CreateTable
CREATE TABLE "api"."Users" (
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "fullname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "role" "api"."UsersRoles" NOT NULL,
    "status" "api"."UserStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "api"."Posts" (
    "postId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "api"."PostStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Posts_pkey" PRIMARY KEY ("postId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_username_key" ON "api"."Users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "api"."Users"("email");

-- CreateIndex
CREATE INDEX "Users_fullname_username_email_idx" ON "api"."Users"("fullname", "username", "email");

-- CreateIndex
CREATE INDEX "Posts_title_content_idx" ON "api"."Posts"("title", "content");

-- AddForeignKey
ALTER TABLE "api"."Posts" ADD CONSTRAINT "Posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "api"."Users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
