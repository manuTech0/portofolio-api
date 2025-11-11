import type { YogaInitialContext } from "graphql-yoga";
import { isTokenError, verifyToken, type TokenError, GenerateTokenType } from "./jwt";
import prisma from "./prisma";
import type { Context } from "./builderSchema";
import cookie from "cookie"
import { initContextCache } from "@pothos/core";

export async function createContext(context: YogaInitialContext): Promise<Context> {
    const cookiesRaw = context.request.headers.get("cookie") ?? ""
    const cookies = cookie.parse(cookiesRaw)
    const tokenJson = cookies["token"]
    const { request } = context
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    
    let ip = 'unknown';
    
    if (forwardedFor) {
        ip = forwardedFor.split(',')[0].trim();
    } else if (realIp) {
        ip = realIp;
    } else if (cfConnectingIp) {
        ip = cfConnectingIp;
    } else {
        // Try to get from underlying Node.js HTTP request
        // Different adapters may expose this differently
        const possibleReq = 
        (request as any).raw ||           // Common in some adapters
        (request as any).req ||            // Express-style
        (request as any).node?.req ||      // Some Node adapters
        (context as any).req;       // Direct from context
        
        if (possibleReq) {
        const nodeReq = possibleReq;
        ip = 
            nodeReq.socket?.remoteAddress ||
            (nodeReq as any).connection?.remoteAddress ||
            (nodeReq as any).info?.remoteAddress ||
            'unknown';
        }
    }
    
    // Clean up IPv6 localhost format
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
        ip = '127.0.0.1';
    }
    
    // For development/testing, use a consistent localhost IP
    if (ip === 'unknown' && request.headers.get('host')?.includes('localhost')) {
        ip = '127.0.0.1';
    }
    const req = {
        ip: ip
    }
    if(cookiesRaw && tokenJson) {
        const token: GenerateTokenType = JSON.parse(tokenJson)
        try {
            const decode = await verifyToken(token.access_token)
            if(isTokenError(decode)) {
                return {
                    errors: decode,
                    req
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
                }, req}
            }
            return {
                currentUser: {
                    userId: sessionData.userId,
                    role: sessionData.user.role,
                    isVerified: sessionData.user.verified
                },
                req
            } 
        } catch (error) {
            if(error instanceof Error) {
                return { errors: {
                    message: error.message
                }, req}
            }
            return { errors: {
                message: String(error)
            }, req}
        }
    }
    return {
        errors: {
            message: "Authorization is invalid",
        },
        req
    }
}