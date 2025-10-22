import prisma from "../../lib/prisma";
import { builder } from "../../lib/builderSchema";

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
        postsCount: t.int({
            resolve: async () => {
                return prisma.posts.count({
                    where: { status: "public" }
                })
            }
        }),
        postsCountByUser: t.int({
            args: {
                userId: t.arg.string({ required: true })
            },
            resolve: async (_, args) => {
                return prisma.posts.count({
                    where: { AND: [ 
                            { status: "public" },
                            { userId: args.userId }
                        ]
                    }
                })
            }
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
                userId: t.arg.string(),
                username: t.arg.string()
            },
            resolve: async (query, root, args, ctx, info) => 
                prisma.users.findFirst({
                    ...query,
                    where: {
                        AND: [
                            { posts: {
                                some: {
                                    status: "public"
                                }
                            } },
                            { OR: [
                                { userId: args.userId! },
                                { username: args.username }
                            ] }
                        ]
                    },
                    include: {
                        posts: true
                    },
                })
        }),
        AllByUser: t.prismaField({
            type: "Users",
            args: {
                userId: t.arg.string(),
                username: t.arg.string()
            },
            authScopes: {
                isLogged: true
            },
            resolve: async (query, root, args, ctx, info) => {
                const user = await prisma.users.findFirst({
                    where: { userId: ctx.currentUser?.userId! },
                    select: {
                        userId: true
                    }
                })
                return prisma.users.findFirst({
                    ...query,
                    where: {
                        AND: [
                            { posts: {
                                some: {
                                    userId: user?.userId!
                                }
                            }},
                            {
                                OR: [
                                    { userId: args.userId! },
                                    { username: args.username }
                                ]
                            }
                        ],
                    },
                    include: {
                        posts: true
                    },
                })
            }
        }),
        BySlug: t.prismaField({
            type: "Posts",
            args: {
                slug: t.arg.string({ required: true })
            },
            resolve: async (query, root, args, ctx, info) => {
                const post = await prisma.posts.findFirst({
                    where: { slug: args.slug }
                })
                const isMe: boolean = ctx.currentUser?.userId == post?.userId
                const status = isMe ? [{}] : [{ status: "public" }]
                return prisma.posts.findFirst({
                    ...query,
                    where: {
                        AND: [
                            ...status,
                            {
                                slug: args.slug
                            }
                        ]
                    },
                })
            }
        }),
    })
})