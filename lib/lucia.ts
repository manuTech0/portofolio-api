import { Lucia } from "lucia";
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import prisma from "./prisma";

export const lucia = new Lucia(new PrismaAdapter(prisma.session, prisma.users), {
    sessionCookie: {
        attributes: {
            secure: process.env.NODE_ENV == "production"
        },
    },
    getUserAttributes(attribute) {
        return {
            provider: attribute.provider,
            username: attribute.username,
            providerId: attribute.providerId,
            email: attribute.email,
            userId: attribute.userId
        }
    },
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      username: string;
      email: string;
      userId: string;
      provider: string;
      providerId: string;
    };
  }
}