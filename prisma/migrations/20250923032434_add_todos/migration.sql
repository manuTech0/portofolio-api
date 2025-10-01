-- CreateTable
CREATE TABLE "api"."Todos" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "data" TEXT NOT NULL,

    CONSTRAINT "Todos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Todos_userId_key" ON "api"."Todos"("userId");

-- AddForeignKey
ALTER TABLE "api"."Todos" ADD CONSTRAINT "Todos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "api"."Users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
