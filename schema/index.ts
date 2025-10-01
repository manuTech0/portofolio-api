import fg from "fast-glob";
import { builder } from "../lib/builderSchema";

export async function loadSchema() {
    await import("./types/enum")
    await import("./types/dateTime")
    await import("./types/users")
    await import("./types/posts")
    await import("./types/todos")
    await import("./query/publicPosts")
    await import("./query/myTodos")
    await import("./query/meQuery")
    await import("./mutation/post")
    await import("./mutation/todo")
    // await import("./mutation/user")
    return builder.toSchema({});
}