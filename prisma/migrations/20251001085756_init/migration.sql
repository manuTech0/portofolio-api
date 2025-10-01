-- CreateEnum
CREATE TYPE "public"."PostStatus" AS ENUM ('public', 'private', 'deleted', 'draft');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('deleted', 'banded');

-- CreateEnum
CREATE TYPE "public"."UsersRoles" AS ENUM ('user', 'admin', 'superuser');

-- CreateTable
CREATE TABLE "public"."Users" (
    "userId" TEXT NOT NULL,
    "username" TEXT,
    "fullname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "role" "public"."UsersRoles" NOT NULL DEFAULT 'user',
    "profilePicture" TEXT,
    "status" "public"."UserStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,
    "provider" TEXT,
    "providerId" TEXT,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."Posts" (
    "postId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "public"."PostStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Posts_pkey" PRIMARY KEY ("postId")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Todos" (
    "todosId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "data" TEXT NOT NULL,

    CONSTRAINT "Todos_pkey" PRIMARY KEY ("todosId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_username_key" ON "public"."Users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "public"."Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Users_providerId_key" ON "public"."Users"("providerId");

-- CreateIndex
CREATE INDEX "Users_fullname_username_email_idx" ON "public"."Users"("fullname", "username", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Posts_title_key" ON "public"."Posts"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Posts_slug_key" ON "public"."Posts"("slug");

-- CreateIndex
CREATE INDEX "Posts_title_content_slug_idx" ON "public"."Posts"("title", "content", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Todos_userId_key" ON "public"."Todos"("userId");

-- AddForeignKey
ALTER TABLE "public"."Posts" ADD CONSTRAINT "Posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Todos" ADD CONSTRAINT "Todos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
