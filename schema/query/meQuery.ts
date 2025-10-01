import { builder } from "../../lib/builderSchema";
import prisma from "../../lib/prisma";

export const Me = builder.queryType({
    fields: (t) => ({
        me: t.prismaField({
            type: "Users",
            resolve: async (query, _root, _args, ctx, _info) => {
                const userId = ctx.currentUser?.userId
                if(!userId) {
                    throw new Error("Unauthorized");
                }
                const user = await prisma.users.findUnique({
                    ...query,
                    where: {
                        userId: userId
                    },
                })
                return user
            }
        })
    })
})