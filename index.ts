import { type CustomJWTPayload, generateToken } from './lib/jwt';
import { useCSRFPrevention } from '@graphql-yoga/plugin-csrf-prevention';
import { logger } from './lib/logger';
import { createYoga } from "graphql-yoga";
import { loadSchema } from "./schema"
import express, { type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import path from 'node:path';
import router from './server/server';
import { memoryStore } from './lib/memoryStore';
import { lucia } from './lib/lucia';
import prisma from './lib/prisma';
import { createContext } from './lib/yogaContext';
import cors from "cors";
import morgan from 'morgan';

const app = express()

function getAllowedHosts(): string[] | undefined {
    return process.env.ALLOWED_HOST
        ?.split(",")
        .map(h => h.trim())
        .filter(Boolean)
}

app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const schema = await loadSchema()

const yoga = createYoga({ 
    schema,
    landingPage: false,
    logging: {
        debug(...args) {
            logger.debug(args)
        },
        info(...args) {
            logger.info(args)
        },
        warn(...args) {
            logger.warn(args)
        },
        error(...args) {
            logger.error(args)
        },
        
    },
    multipart: true,
    cors: {
        origin: getAllowedHosts(),
        credentials: true,
        allowedHeaders: [ "x-csrf-token", "Authorization", "content-type", "x-forwarded-for", "x-real-ip", "cf-connecting-ip"],
        methods: ["POST"]
    },
    plugins: [
        useCSRFPrevention({
            requestHeaders: [ "x-csrf-token" ]
        }),
    ],
    context: createContext,
    graphiql: process.env.NODE_ENV !== "production"
})

app.use((req, res, next) => {
    const allowed = process.env.ALLOWED_HOST
        ?.split(',')
        .map(s => s.trim())
        .filter(Boolean) || [];
    
    const origin = req.headers.origin;
    const host = req.headers.host;
    const referer = req.headers.referer;
    
    console.log('Origin:', origin, 'Host:', host, 'Referer:', referer);
    console.log('Allowed hosts:', allowed);
    
    // ✅ Handle same-origin requests (undefined origin)
    if (!origin) {
        // Cek referer
        if (referer) {
            try {
                const refererUrl = new URL(referer);
                const refererHost = refererUrl.host;
                const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
                
                console.log('Referer host:', refererHost);
                console.log('Referer origin:', refererOrigin);
                
                // Case 1: Referer dari host yang sama (same-origin)
                if (refererHost === host) {
                    console.log('✅ Allowed: same-origin from referer (host match)');
                    res.setHeader('Access-Control-Allow-Credentials', 'true');
                    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
                    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
                    
                    if (req.method === 'OPTIONS') {
                        return res.sendStatus(204);
                    }
                    return next();
                }
                
                // Case 2: Referer dari whitelist
                const normalizedRefererOrigin = refererOrigin.replace(/\/$/, '');
                const isAllowedReferer = allowed.some(h => h.replace(/\/$/, '') === normalizedRefererOrigin);
                
                if (isAllowedReferer) {
                    console.log('✅ Allowed: referer in whitelist:', normalizedRefererOrigin);
                    res.setHeader('Access-Control-Allow-Origin', refererOrigin);
                    res.setHeader('Access-Control-Allow-Credentials', 'true');
                    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
                    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
                    
                    if (req.method === 'OPTIONS') {
                        return res.sendStatus(204);
                    }
                    return next();
                }
                
                // Case 3: Referer dari domain lain (bukan whitelist)
                console.log('❌ Blocked: referer not in whitelist:', normalizedRefererOrigin);
                return res.status(403).json({ 
                    error: 'Forbidden: Referer not allowed',
                    referer: normalizedRefererOrigin 
                });
                
            } catch (e) {
                console.log('⚠️ Invalid referer URL:', referer, e.message);
                // Jika referer invalid, block di production
                if (process.env.NODE_ENV === 'production') {
                    return res.status(403).json({ error: 'Forbidden: Invalid referer' });
                }
            }
        }
        
        // Tidak ada referer
        if (process.env.NODE_ENV !== 'production') {
            // Development: allow all tanpa referer
            console.log('⚠️ Dev mode: allowing undefined origin without referer');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
            
            if (req.method === 'OPTIONS') {
                return res.sendStatus(204);
            }
            return next();
        }
        
        // Production: block undefined origin tanpa referer
        console.log('❌ Blocked: undefined origin without referer');
        return res.status(403).json({ error: 'Forbidden: Origin or Referer required' });
    }
    
    // Handle cross-origin requests (origin ada)
    const normalizedOrigin = origin.replace(/\/$/, '');
    const isAllowed = allowed.some(h => h.replace(/\/$/, '') === normalizedOrigin);
    
    if (isAllowed) {
        console.log('✅ Allowed: origin in whitelist:', normalizedOrigin);
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
        
        if (req.method === 'OPTIONS') {
            return res.sendStatus(204);
        }
        return next();
    }
    
    // Development: allow semua origin
    if (process.env.NODE_ENV !== 'production') {
        console.log('⚠️ Dev mode: allowing origin:', normalizedOrigin);
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
        
        if (req.method === 'OPTIONS') {
            return res.sendStatus(204);
        }
        return next();
    }
    
    // Production: block origin tidak di whitelist
    console.log('❌ Blocked: origin not in whitelist:', normalizedOrigin);
    return res.status(403).json({ 
        error: 'Not allowed by CORS',
        origin: normalizedOrigin 
    });
});

app.use("/graphql", yoga)

app.use("/auth", router)

function validateRedirectUrl(redirectUrl: string | undefined, allowedHost?: string[]): URL | null {
    try {
        const url = new URL(decodeURIComponent(redirectUrl ?? "https://www.manu-tech.my.id"))
        if (process.env.NODE_ENV === "production" && allowedHost && !allowedHost.includes(url.hostname)) {
            return null
        }
        return url
    } catch {
        return null
    }
}

app.get("/", async (req: Request, res: Response) => {
    const redirectUrl = req.query.redirect_url?.toString()
    const allowedHosts = getAllowedHosts()
    const url = validateRedirectUrl(redirectUrl, allowedHosts)

    const sessionId = lucia.readSessionCookie(req.headers.cookie ?? "")
    if (sessionId) {
        if(url) {
            prisma.session.update({
                where: {
                    id: sessionId
                },
                data: {
                    redirectUrl: url.href
                }
            })
        }
        return res.redirect("/generate-token")
    }

    if (!url) {
        return res.status(403).json({ error: "Invalid redirect url" })
    }
    memoryStore.set("oauth_redirect_url", url.href, 300 * 1000)


    return res.sendFile(path.join(__dirname, "public/index.html"))
})


app.get("/signup", async (req: Request, res: Response) => {
    const redirectUrl = req.query.redirect_url?.toString()
    const allowedHosts = getAllowedHosts()
    const url = validateRedirectUrl(redirectUrl, allowedHosts)

    if (!url) {
        return res.status(403).json({ error: "Invalid redirect url" })
    }

    const sessionId = lucia.readSessionCookie(req.headers.cookie ?? "")
    if (sessionId) {
        return res.redirect("/generate-token")
    }
    if (!memoryStore.get("oauth_redirect_url")) {
        memoryStore.set("oauth_redirect_url", url.href, 300 * 1000)
    }


    return res.sendFile(path.join(__dirname, "public/signup.html"))
})


app.get("/generate-token", async (req: Request, res: Response) => {
    const session = lucia.readSessionCookie(req.headers.cookie ?? "")
    if (!session) {
        return res.redirect("/")
    }

    const sessionData = await prisma.session.findUnique({
        where: { id: session },
        include: {
            user: {
                omit: { password: true, role: true }
            }
        }
    })

    if (!sessionData) {
        return res.status(401).json({ error: "Invalid session" })
    }

    const redirectUrl = memoryStore.get("oauth_redirect_url") as string | undefined

    const url = new URL(redirectUrl || sessionData.redirectUrl ||  "https://www.manu-tech.my.id/")

    const payload: CustomJWTPayload = {
        email: sessionData.user.email,
        provider: sessionData.user.provider!,
        sessionId: session,
        sub: sessionData.user.userId,
        lss: url.origin,
        aud: ["user", "client"],
    }

    const jwtToken = await generateToken(payload, sessionData.expiresAt!)

    return res.cookie("token", JSON.stringify(jwtToken), {
        httpOnly: true,
        domain: process.env.NODE_ENV === "production" ? ".manu-tech.my.id" : "localhost",
        ...(process.env.NODE_ENV === "production" && { domain: ".manu-tech.my.id" }),
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 60 * 60 * 1000
    }).redirect(url.href)
})

app.use(morgan("combined"))

app.listen(process.env.PORT ?? 4000, (p) => {
    logger.info(`API listening in *:${process.env.PORT ?? 4000}`)
})
