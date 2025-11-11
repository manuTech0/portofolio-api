import SchemaBuilder from "@pothos/core";
import PothosPrismaPlugin from "@pothos/plugin-prisma";
import prisma from "./prisma";
import PothosZodPlugin from "@pothos/plugin-zod";
import PothosScopeAuthPlugin from "@pothos/plugin-scope-auth";
import type PrismaTypes from "./generated/pothos-prisma";
import type { UsersRoles } from "./generated/prisma";
import type { Request } from "express";

export interface Context {
    currentUser?: {
        userId: string;
        role: UsersRoles;
        isVerified: boolean;
    } | null;
    errors?: {
        message: string;
        code?: string;
    },
    req: {
      ip: string;
    };
}

export const builder = new SchemaBuilder<{
  PrismaTypes: PrismaTypes;
  AuthScopes: {
    isAdmin: boolean;
    isAdminOrUser: boolean;
    isUser: boolean;
    isSuperUser: boolean;
    isMe: { userId: string };
    isLogged: boolean;
    isPublic: boolean;
  };
  Scalars: {
    DateTime: { Input: Date; Output: Date };
  };
  Context: Context;
}>({
  plugins: [PothosPrismaPlugin, PothosZodPlugin, PothosScopeAuthPlugin],
  prisma: {
    client: prisma,
    dmmf: (await import("./generated/prisma")).Prisma.dmmf,
  },
  zod: {
    validationError(zodError) {
      const errorMessages = zodError.issues.map(e => `${e.path.join('.')}: ${e.message}`);
      return errorMessages.join("\n");
    },
  },
  scopeAuth: {
    authorizeOnSubscribe: true,
    authScopes: (ctx) => ({
      isAdmin: ctx.currentUser?.role === "admin",
      isUser: !!ctx.currentUser && ctx.currentUser.role === "user",
      isAdminOrUser:
        ctx.currentUser?.role === "admin" || ctx.currentUser?.role === "user",
      isSuperUser: ctx.currentUser?.role === "superuser",
      isMe: (parent) => {
        return ctx.currentUser?.userId == parent.userId
      },
      isLogged: ctx.currentUser != undefined && ctx.currentUser != null,
      isPublic: false
    }),
  },
});
