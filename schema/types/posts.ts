import { builder } from "../../lib/builderSchema";
import { PostStatus } from "./enum";

export const Posts = builder.prismaObject("Posts", {
    fields: (t) => ({
        postId: t.exposeString("postId"),
        title: t.exposeString("title"),
        content: t.exposeString("content"),
        user: t.relation("user"),
        slug: t.exposeString("slug"),
        userId: t.exposeString("userId"),
        status: t.expose("status", {
            type: PostStatus,
            authScopes(parent) {
                return {
                    isMe: parent,
                    isAdmin: true
                }
            },
        }),
        createdAt: t.expose("createdAt", { 
            type: "DateTime"
        }),
        updateAt: t.expose("updateAt", { 
            type: "DateTime",
            authScopes: {
                isAdminOrUser: true,
            }
        }),
    })
})