import { builder } from "../../lib/builderSchema";

export const Todos = builder.prismaObject("Todos", {
    authScopes: (parent) => ({
        isMe: parent
    }),
    fields: (t) => ({
        todosId: t.exposeString("todosId"),
        userId: t.exposeString("userId"),
        data: t.exposeString("data"),
        user: t.relation("user")
    })
})