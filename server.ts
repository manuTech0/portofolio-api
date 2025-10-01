import { Router } from "express";
import { lucia } from "./lib/lucia";
import type { Request, Response } from "express";
import { parseCookies, serializeCookie } from "lucia/dist/cookie";
import { logger } from "./lib/logger";
import prisma from "./lib/prisma";
import { nanoid } from "nanoid";
import { GitHub, Google, generateState, generateCodeVerifier, OAuth2RequestError } from "arctic";
import type { GithubEmail, GitHubUser, GoogleUser } from "./lib/types";
import { ZodError } from "zod";
import { loginSchema, SignUpSchema } from "./lib/zodSchema";

const router = Router()

const githubAuth = new GitHub(
    process.env.GITHUB_CLIENT_ID!,
    process.env.GITHUB_CLIENT_SECRET!,
    process.env.GITHUB_REDIRECT_URL!
)
const googleAuth = new Google(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URL!
)

router.get("/github", async (req: Request, res: Response) => {
    const state = generateState()
    const url = githubAuth.createAuthorizationURL(state, ["user:email"])
    res.appendHeader("Set-Cookie", serializeCookie("github_auth_state", state, {
        path: "/",
        secure: process.env.NODE_ENV == "production",
        httpOnly: true,
        maxAge: 60 * 10,
        sameSite: "lax"
    })).redirect(url.toString())
})
router.get("/github/callback", async (req: Request, res: Response) => {
    const { code, state } = req.query;
    const stateCookie = parseCookies(req.headers.cookie ?? "").get("github_auth_state")
    if(code || state && stateCookie) {
        try {
            const tokens = await githubAuth.validateAuthorizationCode(code as string)
            const accessToken = tokens.accessToken()
            const githubUserResponse = await fetch("https://api.github.com/user", {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });
            const emailUsersFetch = await fetch("https://api.github.com/user/emails", {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })
            const githubUser: GitHubUser = await githubUserResponse.json()
            const emailUsers: GithubEmail[] = await emailUsersFetch.json()
            let user = await prisma.users.findUnique({ where: { email: (emailUsers.find(i => i.primary))?.email ?? `${githubUser.id}@github.local` } })
            if(!user) {
                user = await prisma.users.create({
                    data: {
                        username: githubUser.login,
                        fullname: githubUser.name ?? githubUser.login,
                        email: githubUser.email ?? `${githubUser.id}@github.local`,
                        profilePicture: githubUser.avatar_url,
                        verified: true,
                        provider: "github",
                        providerId: String(githubUser.id),
                        role: "user"
                    }
                })
            }
            const session = await lucia.createSession(String(user.userId), {})
            const cookie = await lucia.createSessionCookie(session.id)
            res.setHeader("Set-Cookie", cookie.serialize())
            return res.redirect("/generate-token")
        } catch (e) {
            if(e instanceof OAuth2RequestError) {
                res.status(400).end()
            }
            if(e instanceof Error) {
                logger.error("Unknown error", e.message)
                return res.status(400).end()
            }
        }
    } else {
        logger.error("Code, state and stateCookie not found")
        return res.status(400).end()
    }
})
router.get("/google", async (req: Request, res: Response) => {
    const state = generateState()
    const codeVerifier = generateCodeVerifier()
    const url = googleAuth.createAuthorizationURL(state, codeVerifier, ["openid", "profile", "email"])
    res.appendHeader("Set-Cookie", serializeCookie("google_auth_state", state, {
        path: "/",
        secure: process.env.NODE_ENV == "production",
        httpOnly: true,
        maxAge: 60 * 10,
        sameSite: "lax"
    })).appendHeader("Set-Cookie", serializeCookie("google_auth_verifier", codeVerifier, {
        path: "/",
        secure: process.env.NODE_ENV == "production",
        httpOnly: true,
        maxAge: 60 * 10,
        sameSite: "lax"
    })).redirect(url.toString())
})
router.get("/google/callback", async (req: Request, res: Response) => {
    const { code, state } = req.query;
    const stateCookie = parseCookies(req.headers.cookie ?? "").get("google_auth_state")
    const codeVerifierCookie = parseCookies(req.headers.cookie ?? "").get("google_auth_verifier")
    if(code || state && codeVerifierCookie && stateCookie) {
        try {
            const tokens = await googleAuth.validateAuthorizationCode(code as string, codeVerifierCookie!)
            const accessToken = tokens.accessToken()
            const googleUserResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })
            const googleUser: GoogleUser = await googleUserResponse.json()
            let user = await prisma.users.findUnique({ where: { email: googleUser.email ?? `${googleUser.sub}@google.local` } })
            if(!user) {
                user = await prisma.users.create({
                    data: {
                        username: googleUser.given_name + nanoid(10),
                        fullname: googleUser.given_name + googleUser.family_name,
                        email: googleUser.email ?? `${googleUser.sub}@google.local`,
                        verified: true,
                        provider: "google",
                        providerId: String(googleUser.sub),
                        role: "user"
                    }
                })
            }
            const session = await lucia.createSession(String(user.userId), {})
            const cookie = lucia.createSessionCookie(session.id)
            res.setHeader("Set-Cookie", cookie.serialize())
            res.redirect("/generate-token")
        } catch (e) {
            if(e instanceof OAuth2RequestError) {
                logger.error("Oauth error", e)
                res.status(400).end()
            }
            logger.error("Unknown error", e)
            res.status(400).end()
        }
    } else {
        logger.error("Code, state and stateCookie not found")
        res.status(400).end()
    }
})

router.post("/signin", async (req: Request, res: Response) => {
    const body = req.body
    try {
        const { email, password } = await loginSchema.parseAsync(body)
        const user = await prisma.users.findUnique({ where: { email: email } })
        if(user) {
            const passwordVerify = Bun.password.verifySync(password, user.password ?? "", "argon2id")
            if(passwordVerify) {
                const session = await lucia.createSession(user.userId, {})
                return res
                    .appendHeader("Set-Cookie", lucia.createSessionCookie((await session).id).serialize())
                    .appendHeader("Location", "/generate-token")
                    .redirect("/generate-token")
            } else {
                if(user.provider) {
                    return res.redirect("/?error=User is "+user.provider+" account, please signin use "+user.provider)
                } else {
                    return res.redirect("/?error=Password not match")
                }
            }
        } else {
            return res.redirect("/?error=User not found")
        }
    } catch (e) {
        let zodErr: {
            path: string;
            message?: string;
            zodError: boolean;
        }[] = [{ path: "Unknown", message: "An unexpected error occurred", zodError: true }]
        if (e instanceof ZodError) {
            zodErr = e.issues.map((err) => ({
                path: err.path.join("."), 
                message: err.message,
                zodError: true
            }))
        }
        if(e instanceof Error) {
            logger.error("Unknown error", e.message)
            res.status(400).end()
        }
        const zodErrorStr = (zodErr.find(i => i.zodError)) ? zodErr.map(i => `${i.path}: ${i.message}`).join("\n") : ""
        return res.redirect("/?error=" + zodErrorStr)
    }
})


router.post("/signup", async (req: Request, res: Response) => {
    const body = req.body
    try {
        const validatedData = await SignUpSchema.parseAsync(body)
        const user = await prisma.users.findUnique({ where: { email: validatedData.email } })
        if(!user) {
            const hashedPassword = Bun.password.hashSync(validatedData.confirmPassword, "argon2id")
            const userCreated = await prisma.users.create({
                data: {
                    username: validatedData.username,
                    fullname: validatedData.fullname,
                    email: validatedData.email,
                    password: hashedPassword,
                    role: "user"
                }
            })
            const session = await lucia.createSession(userCreated.userId, {})
            return res
                .appendHeader("Set-Cookie", lucia.createSessionCookie(session.id).serialize())
                .redirect("/generate-token")
        } else {
            return res.redirect("/signup?error=Email alredy use")
        }
    } catch (e) {
        logger.error("error", e)
        let zodErr: {
            path: string;
            message?: string;
            zodError: boolean;
        }[] = [{ path: "Unknown", message: "An unexpected error occurred", zodError: true }]
        if (e instanceof ZodError) {
            zodErr = e.issues.map((err) => ({
                path: err.path.join("."), 
                message: err.message,
                zodError: true
            }))
        }
        const zodErrorStr = (zodErr.find(i => i.zodError)) ? zodErr.map(i => `${i.path}: ${i.message}`).join("\n") : ""
        logger.error(e)
        return res.redirect("/signup?error=" + zodErrorStr)
    }
})


router.post("/logout", async (req: Request, res: Response) => {
    const sessionId = lucia.readSessionCookie(req.headers.cookie ?? "")
    if (!sessionId) {
        logger.info(sessionId)
		return res.status(400).json({ logout: false })
	}
	await lucia.invalidateSession(sessionId);
	return res
		.setHeader("Set-Cookie", lucia.createBlankSessionCookie().serialize())
		.cookie("token", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV == "production",
            sameSite: "lax",
            expires: new Date(0)
        })
		.json({ logout: true });
})

export default router