import { builder } from "../../lib/builderSchema";

export const messageMe = builder.objectType(
    builder.objectRef<{
        type: string;
        success: boolean;
        isBot: boolean;
        needVerify: boolean;
        message: string;
    }>("MessageMeResponse"),
    {
    fields: (t) => ({
        type: t.exposeString("type"),
        success: t.exposeBoolean("success"),
        isBot: t.exposeBoolean("isBot"),
        needVerify: t.exposeBoolean("needVerify"),
        message: t.exposeString("message")
    })
})