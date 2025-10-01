import type { YogaInitialContext } from "graphql-yoga";
import { isTokenError, verifyToken, type TokenError } from "./jwt";
import prisma from "./prisma";
import type { Context } from "./builderSchema";
import cookie from "cookie"

export async function createContext(context: YogaInitialContext): Promise<Context> {
    const cookiesRaw = context.request.headers.get("cookie") ?? ""
    const cookies = cookie.parse(cookiesRaw)
    const token = cookies["token"]
    if(cookiesRaw && token) {
        try {
            const decode = await verifyToken(token)
            if(isTokenError(decode)) {
                return {
                    errors: decode
                }
            }
            const sessionData = await prisma.session.findUnique({ 
                where: { id: decode.payload.sessionId },
                include: {
                    user: true
                }
            })

            if(!sessionData) {
                return { errors: {
                    message: "failed token"
                }}
            }
            return {
                currentUser: {
                    userId: sessionData.userId,
                    role: sessionData.user.role,
                    isVerified: sessionData.user.verified
                }
            } 
        } catch (error) {
            if(error instanceof Error) {
                return { errors: {
                    message: error.message
                }}
            }
            return { errors: {
                message: String(error)
            }}
        }
    }
    return {
        errors: {
            message: "Authorization is invalid",
        }
    }
}