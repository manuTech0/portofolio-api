import { Router } from "express";
import { lucia } from "../lib/lucia";
import type { Request, Response } from "express";
import { parseCookies, serializeCookie } from "lucia/dist/cookie";
import { logger } from "../lib/logger";
import prisma from "../lib/prisma";
import { nanoid } from "nanoid";
import {
  GitHub,
  Google,
  generateState,
  generateCodeVerifier,
  OAuth2RequestError,
} from "arctic";
import type { GithubEmail, GitHubUser, GoogleUser } from "../lib/types";
import { ZodError } from "zod";
import { loginSchema, SignUpSchema } from "../lib/zodSchema";
import { memoryStore } from "../lib/memoryStore";

const router = Router();

const githubAuth = new GitHub(
  process.env.GITHUB_CLIENT_ID!,
  process.env.GITHUB_CLIENT_SECRET!,
  process.env.GITHUB_REDIRECT_URL!
);

const googleAuth = new Google(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  process.env.GOOGLE_REDIRECT_URL!
);

// ===== GITHUB AUTH =====
router.get("/github", async (req: Request, res: Response) => {
  const state = generateState();
  const url = githubAuth.createAuthorizationURL(state, ["user:email"]);
  res
    .appendHeader(
      "Set-Cookie",
      serializeCookie("github_auth_state", state, {
        path: "/",
        secure: process.env.NODE_ENV == "production",
        httpOnly: true,
        maxAge: 60 * 10,
        sameSite: "lax",
      })
    )
    .redirect(url.toString());
});

router.get("/github/callback", async (req: Request, res: Response) => {
  const { code, state } = req.query;
  const stateCookie = parseCookies(req.headers.cookie ?? "").get(
    "github_auth_state"
  );

  if (code && state && stateCookie) {
    try {
      const tokens = await githubAuth.validateAuthorizationCode(code as string);
      const accessToken = tokens.accessToken();

      const [githubUserResponse, emailUsersFetch] = await Promise.all([
        fetch("https://api.github.com/user", {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch("https://api.github.com/user/emails", {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      const githubUser: GitHubUser = await githubUserResponse.json();
      const emailUsers: GithubEmail[] = await emailUsersFetch.json();

      let user = await prisma.users.findFirst({
        where: {
          OR: [
            {
              email:
                emailUsers.find((i) => i.primary)?.email ??
                `${githubUser.id}@github.local`,
            },
            { providerId: String(githubUser.id) },
          ],
        },
      });

      if (!user) {
        user = await prisma.users.create({
          data: {
            username: githubUser.login,
            fullname: githubUser.name ?? githubUser.login,
            email: githubUser.email ?? `${githubUser.id}@github.local`,
            profilePicture: githubUser.avatar_url,
            verified: true,
            provider: "github",
            providerId: String(githubUser.id),
            role: "user",
          },
        });
      }

      const session = await lucia.createSession(String(user.userId), {
        redirectUrl:
          (memoryStore.get("oauth_redirect_url") as string | undefined) ||
          "https://www.manu-tech.my.id",
      });

      const cookie = await lucia.createSessionCookie(session.id);
      res.setHeader("Set-Cookie", cookie.serialize());
      return res.redirect("/generate-token");
    } catch (e) {
      if (e instanceof OAuth2RequestError) {
        return res.redirect("/?error=OAuth2 authorization failed");
      }
      logger.error("Unknown error", e);
      return res.redirect("/?error=GitHub authentication failed");
    }
  } else {
    logger.error("Code, state and stateCookie not found");
    return res.redirect("/?error=Invalid GitHub callback parameters");
  }
});

// ===== GOOGLE AUTH =====
router.get("/google", async (req: Request, res: Response) => {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = googleAuth.createAuthorizationURL(state, codeVerifier, [
    "openid",
    "profile",
    "email",
  ]);

  res
    .appendHeader(
      "Set-Cookie",
      serializeCookie("google_auth_state", state, {
        path: "/",
        secure: process.env.NODE_ENV == "production",
        httpOnly: true,
        maxAge: 60 * 10,
        sameSite: "lax",
      })
    )
    .appendHeader(
      "Set-Cookie",
      serializeCookie("google_auth_verifier", codeVerifier, {
        path: "/",
        secure: process.env.NODE_ENV == "production",
        httpOnly: true,
        maxAge: 60 * 10,
        sameSite: "lax",
      })
    )
    .redirect(url.toString());
});

router.get("/google/callback", async (req: Request, res: Response) => {
  const { code, state } = req.query;
  const stateCookie = parseCookies(req.headers.cookie ?? "").get(
    "google_auth_state"
  );
  const codeVerifierCookie = parseCookies(req.headers.cookie ?? "").get(
    "google_auth_verifier"
  );

  if (code && state && codeVerifierCookie && stateCookie) {
    try {
      const tokens = await googleAuth.validateAuthorizationCode(
        code as string,
        codeVerifierCookie!
      );
      const accessToken = tokens.accessToken();

      const googleUserResponse = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const googleUser: GoogleUser = await googleUserResponse.json();

      let user = await prisma.users.findFirst({
        where: {
          OR: [
            {
              email: googleUser.email ?? `${googleUser.sub}@google.local`,
            },
            { providerId: String(googleUser.sub) },
          ],
        },
      });

      if (!user) {
        user = await prisma.users.create({
          data: {
            username: googleUser.given_name + nanoid(10),
            fullname: googleUser.given_name + googleUser.family_name,
            email: googleUser.email ?? `${googleUser.sub}@google.local`,
            verified: true,
            provider: "google",
            providerId: String(googleUser.sub),
            role: "user",
          },
        });
      }

      const session = await lucia.createSession(String(user.userId), {
        redirectUrl:
          (memoryStore.get("oauth_redirect_url") as string | undefined) ||
          "https://www.manu-tech.my.id",
      });

      const cookie = lucia.createSessionCookie(session.id);
      res.setHeader("Set-Cookie", cookie.serialize());
      return res.redirect("/generate-token");
    } catch (e) {
      logger.error("OAuth error", e);
      return res.redirect("/?error=Google authentication failed");
    }
  } else {
    logger.error("Code, state, or verifier missing");
    return res.redirect("/?error=Invalid Google callback parameters");
  }
});

// ===== SIGNIN =====
router.post("/signin", async (req: Request, res: Response) => {
  try {
    const { email, password } = await loginSchema.parseAsync(req.body);
    const user = await prisma.users.findUnique({ where: { email } });

    if (!user) return res.redirect("/?error=User not found");

    const passwordVerify = Bun.password.verifySync(
      password,
      user.password ?? "",
      "argon2id"
    );

    if (!passwordVerify) {
      if (user.provider) {
        return res.redirect(
          `/?error=User is ${user.provider} account, please sign in using ${user.provider}`
        );
      }
      return res.redirect("/?error=Incorrect password");
    }

    const session = await lucia.createSession(user.userId, {
      redirectUrl:
        (memoryStore.get("oauth_redirect_url") as string | undefined) ||
        "https://www.manu-tech.my.id",
    });

    res.appendHeader(
      "Set-Cookie",
      lucia.createSessionCookie(session.id).serialize()
    );

    return res.redirect("/generate-token");
  } catch (e) {
    if (e instanceof ZodError) {
      const zodErrorStr = e.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return res.redirect(`/?error=${encodeURIComponent(zodErrorStr)}`);
    }

    logger.error("Signin error", e);
    return res.redirect("/?error=Signin failed");
  }
});

// ===== SIGNUP =====
router.post("/signup", async (req: Request, res: Response) => {
  try {
    const data = await SignUpSchema.parseAsync(req.body);
    const existingUser = await prisma.users.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return res.redirect("/signup?error=Email already in use");
    }

    const hashedPassword = Bun.password.hashSync(
      data.confirmPassword,
      "argon2id"
    );

    const newUser = await prisma.users.create({
      data: {
        username: data.username,
        fullname: data.fullname,
        email: data.email,
        password: hashedPassword,
        role: "user",
      },
    });

    const session = await lucia.createSession(newUser.userId, {
      redirectUrl:
        (memoryStore.get("oauth_redirect_url") as string | undefined) ||
        "https://www.manu-tech.my.id",
    });

    res
      .appendHeader("Set-Cookie", lucia.createSessionCookie(session.id).serialize())
      .redirect("/generate-token");
  } catch (e) {
    logger.error("Signup error", e);
    if (e instanceof ZodError) {
      const zodErrorStr = e.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return res.redirect(`/signup?error=${encodeURIComponent(zodErrorStr)}`);
    }
    return res.redirect("/signup?error=Signup failed");
  }
});

// ===== LOGOUT (JSON response) =====
router.post("/logout", async (req: Request, res: Response) => {
  const sessionId = lucia.readSessionCookie(req.headers.cookie ?? "");
  if (!sessionId) {
    return res.status(400).json({ logout: false });
  }

  await lucia.invalidateSession(sessionId);

  return res
    .setHeader("Set-Cookie", lucia.createBlankSessionCookie().serialize())
    .cookie("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV == "production",
      sameSite: "lax",
      expires: new Date(0),
    })
    .json({ logout: true });
});

router.get("/logout", async (req: Request, res: Response) => {
  const sessionId = lucia.readSessionCookie(req.headers.cookie ?? "");
  if (!sessionId) {
    return res.status(400).json({ logout: false });
  }

  await lucia.invalidateSession(sessionId);

  return res
    .setHeader("Set-Cookie", lucia.createBlankSessionCookie().serialize())
    .cookie("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV == "production",
      sameSite: "lax",
      expires: new Date(0),
    })
    .json({ logout: true });
});

export default router;
