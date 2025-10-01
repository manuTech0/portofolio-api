import prisma from "../../lib/prisma";
import { builder } from "../../lib/builderSchema";
import { argsToArgsConfig } from "graphql/type/definition";

export const publicPosts = builder.queryType({
    name: "PublicPosts",
    fields: (t) => ({
        GetAll: t.prismaField({
            type: ["Posts"],
            args: {
                skip: t.arg.int(),
                take: t.arg.int()
            },
            resolve: async (query, root, args, ctx, info) =>
                prisma.posts.findMany({
                    ...query,
                    where: { status: "public" },
                    skip: args.skip!,
                    take: args.take!,
                    include: {
                        user: true
                    }
                })
        }),
        ByTitle: t.prismaField({
            type: "Posts",
            args: {
                title: t.arg.string({ required: true })
            },
            resolve: async (query, root, args, ctx, info) =>
                prisma.posts.findFirst({
                    ...query,
                    where: {
                        AND: [
                            { status: "public" },
                            { title: { contains: args.title } }
                        ]
                    },
                    include: {
                        user: true
                    }
                })
        }),
        ByUser: t.prismaField({
            type: "Users",
            args: {
                userId: t.arg.string({ required: true })
            },
            resolve: async (query, root, args, ctx, info) => 
                prisma.users.findFirst({
                    ...query,
                    where: {
                        OR: [
                            { posts: {
                                some: {
                                    status: "public"
                                }
                            } },
                            { userId: args.userId }
                        ]
                    },
                    include: {
                        posts: true
                    },
                })
        })
    })
})