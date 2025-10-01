import { builder } from "../../lib/builderSchema";

export const PostStatus = builder.enumType("PostStatus", {
    values: ["public", "private", "deleted", "draft"]
})
export const UserStatus = builder.enumType("UserStatus", {
    values: ["deleted", "banded"]
})
export const UsersRole = builder.enumType("UsersRole", {
    values: ["admin", "user", "superuser"]
})