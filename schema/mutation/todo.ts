import z, { ZodError } from "zod";
import { builder } from "../../lib/builderSchema";
import prisma from "../../lib/prisma";
import DOMPurify from "isomorphic-dompurify"
import { todosSchema } from "../types/todosData";

export const mutationPosts = builder.mutationType({
    fields: (t) => ({
        saveTodos: t.prismaField({
            type: "Todos",
            args: {
                data: t.arg.string({
                    required: true,
                    validate: {
                        schema: todosSchema
                    }
                })
            },
            authScopes:{
                isLogged: true
            },
            resolve: async (query, _parent, args, ctx) => {
                const userId = ctx.currentUser?.userId
                if(!userId) {
                    throw new Error("Unauthorized");
                }
                let data = await prisma.todos.findFirst({
                    where: { userId }
                })
                if(data) {
                    data = await prisma.todos.update({
                        where: { userId },
                        data: {
                            data: args?.data,
                        }
                    })
                } else {
                    data = await prisma.todos.create({
                        data: {
                            userId,
                            data: args?.data
                        }
                    })
                }
                return data
            }
        }),
    })
})