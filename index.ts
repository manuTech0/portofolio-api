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
        allowedHeaders: [ "x-csrf-token", "Authorization", "content-type" ],
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

app.use(cors({
    origin(origin, callback) {
        const allowed = process.env.ALLOWED_HOST?.trim().split(", ")
        console.log(allowed, origin)
        if (!origin || allowed?.includes(origin)) {
            callback(null, true)
        } else {
            if(process.env.NODE_ENV == "production") {
                callback(new Error("Not allowed by CORS"))
            } else {
                callback(null, true)
            }
        }
    },
    credentials: true,
}))

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

app.listen(process.env.PORT ?? 4000, (p) => {
    logger.info(`API listening in *:${process.env.PORT ?? 4000}`)
})
