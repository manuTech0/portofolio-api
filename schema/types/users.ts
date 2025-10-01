import { builder } from "../../lib/builderSchema";
import { UsersRole, UserStatus } from "./enum";

export const Users = builder.prismaObject("Users", {
    fields: (t) => ({
        userId: t.exposeString("userId"),
        username: t.exposeString("username"),
        fullname: t.exposeString("fullname"),
        profilePicture: t.exposeString("profilePicture"),
        password: t.exposeString("password", {
            authScopes(parent) {
                return {
                    isMe: parent,
                }
            },
        }),
        email: t.exposeString("email", {
            authScopes(parent) {
                return {
                    isMe: parent,
                    isAdmin: true
                }
            },
        }),
        verified: t.exposeBoolean("verified", {
            authScopes(parent) {
                return {
                    isMe: parent,
                    isAdmin: true
                }
            },
        }),
        provider: t.exposeString("provider", {
            authScopes(parent) {
                return {
                    isMe: parent,
                    isAdmin: true
                }
            },
        }),
        status: t.expose("status", {
            type: UserStatus,
            authScopes(parent) {
                return {
                    isMe: parent,
                    isAdmin: true
                }
            },
        }),
        role: t.expose("role", {
            type: UsersRole,
            authScopes(parent) {
                return {
                    isAdmin: true,
                }
            },
        }),
        posts: t.relation("posts"),
        todo: t.relation("todos"),
        createdAt: t.expose("createdAt", {
            type: "DateTime",
            authScopes(parent) {
                return {
                    isMe: parent,
                    isAdmin: true
                }
            },
        }),
        updateAt: t.expose("updateAt", {
            type: "DateTime",
            authScopes(parent) {
                return {
                    isMe: parent,
                    isAdmin: true
                }
            },
        }),
    })
})
