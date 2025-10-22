import slugify from 'slugify';
import { builder } from "../../lib/builderSchema";
import prisma from "../../lib/prisma";
import { changeVisibilitySchema, createPostSchema, deletePostSchema, updatePostSchema } from '../../lib/zodSchema';
import { ZodError } from 'zod';

export const mutationPosts = builder.mutationType({
    fields: (t) => ({
        create: t.prismaField({
            type: "Posts",
            args: {
                title: t.arg.string({ required: true }),
                content: t.arg.string({ required: true })
            },
            validate: {
                schema: createPostSchema
            },
            authScopes: {
                isLogged: true
            },
            resolve: async (query, _parent, args, ctx) => {
                const unique = await prisma.posts.findFirst({
                    where: {
                        slug: slugify(args.title, {
                            lower: true,
                            trim: true
                        })
                    }
                })
                if(unique) {
                    throw Error(`title="${args.title}" already exist`)
                }
                console.log("proccesing")
                return prisma.posts.create({
                    ...query,
                    data: {
                        title: args.title,
                        content: args.content,
                        slug: slugify(args.title, {
                            lower: true,
                            trim: true
                        }),
                        userId: ctx.currentUser?.userId!,
                        status: "public"
                    }
                })
            }
        }),
        delete: t.prismaField({
            type: ["Posts"],
            args: {
                postId: t.arg.stringList({ required: true })
            },
            validate: {
                schema: deletePostSchema
            },
            resolve: async (query, _parent, args, ctx) => {
                const userId = ctx.currentUser?.userId
                if(!userId) {
                    throw new Error("Unauthorized for delete: "+args.postId.join(", ")  );
                }
                const allPosts = await prisma.posts.findMany({
                    where: { postId: { in: args.postId }, userId }
                })
                if(!allPosts) {
                    throw new Error("no post found or not owned by user");
                }
                await prisma.posts.deleteMany({
                    where: {
                        postId: { in: args.postId }
                    },
                })
                return allPosts
            }
        }),
        update: t.prismaField({
            type: "Posts",
            args: {
                postId: t.arg.string({ required: true }),
                title: t.arg.string(),
                content: t.arg.string()
            },
            validate: {
                schema: updatePostSchema
            },
            resolve: async (query, _parent, args, ctx) => {
                const userId = ctx.currentUser?.userId
                if(!userId) {
                    throw new Error("Unauthorized for update: "+args.postId );
                }
                const unique = await prisma.posts.findFirst({
                    where: { slug: slugify(args.title!, {
                                lower: true,
                                trim: true
                            })
                    }
                        
                })
                if(unique) {
                    throw (Error(`title ${args.title} already exist`) as ZodError)
                }
                const update = await prisma.posts.findFirstOrThrow({
                    ...query, 
                    where: { 
                        AND: [
                            { postId: args.postId },
                            { userId }
                        ]
                    }
                })
                await prisma.posts.update({
                    ...query,
                    where: { postId: update.postId },
                    data: {
                        title: args.title ?? update.title,
                        content: args.content ?? update.content,
                        slug: slugify(args.title!, {
                            lower: true,
                            trim: true
                        })
                    }
                })
                return update
            }
        }),

        ChangeVisibility: t.prismaField({
            type: "Posts",
            args: {
                postId: t.arg.string({ required: true })
            },
            validate: {
                schema: changeVisibilitySchema
            },
            resolve: async (query, root, args, ctx, info) => {
                const post = await prisma.posts.findFirst({
                    ...query,
                    where: {
                        postId: args.postId
                    },
                    include: {
                        user: true
                    }
                })
                if(!post) {
                    throw new Error("Post not defined");
                    
                }
                if(post?.userId != ctx.currentUser?.userId) {
                    throw Error("Unauthorized change post " + post?.title)
                }
                return prisma.posts.update({
                    ...query,
                    where: {
                        postId: args.postId
                    },
                    data: {
                        status: (post?.status == "public") ? "private" : "public"
                    }
                })
            }
        })
    })
})