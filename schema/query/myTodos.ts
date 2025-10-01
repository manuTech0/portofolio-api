import { builder } from "../../lib/builderSchema";
import prisma from "../../lib/prisma";

export const myTodos = builder.queryType({
    name: "MyTodos",
    fields: (t) => ({
        getTodos: t.prismaField({
            type: "Todos",
            resolve: async (query, _root, _args, ctx, _info) => {
                const userId = ctx.currentUser?.userId
                if(!userId) {
                    throw new Error("Unauthorized");
                }
                const todo = await prisma.todos.findUnique({
                    ...query,
                    where: {
                        userId: userId
                    },
                    include: {
                        user: true
                    }
                })
                return todo
            }
        })
    })
})