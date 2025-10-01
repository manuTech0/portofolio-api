import { importPKCS8, importSPKI, type JWTPayload, jwtVerify, type JWTVerifyResult, SignJWT } from "jose";
import { JOSEAlgNotAllowed, JWSSignatureVerificationFailed, JWTExpired, JWTInvalid } from "jose/errors";

export interface TokenError{
    error: boolean;
    code?: string;
    message: string;
}
export interface GenerateTokenType { 
    access_token: string;
    expires_in: Date;
    token_type: string;
}

export function isTokenError(token: any): token is TokenError {
    return (
        token &&
        typeof token === 'object' &&
        typeof token.error === 'boolean' &&
        (typeof token.message === "string" || typeof token.message === "undefined")
    )
}

interface Payload {
    email: string;
    provider?: string;
    sessionId: string;
}
export type CustomJWTPayload = JWTPayload & Payload

const privateKey = await importPKCS8(process.env.PRIVATE_KEY_FILE || "private", "ES256")
export const publicKey = await importSPKI(process.env.PUBLIC_KEY_FILE || "public", "ES256")

export async function generateToken(payload: CustomJWTPayload, expiresAt: Date): Promise<GenerateTokenType | TokenError> {
    try {
        const token: string = await new SignJWT({ ...payload})
            .setProtectedHeader({ alg: "ES256", typ: "JWT" })
            .setExpirationTime(expiresAt)
            .setIssuedAt()
            .sign(privateKey)
        return {
            access_token: token,
            expires_in: new Date(expiresAt),
            token_type: "Bearer"
        }
    } catch (error) {
        if(error instanceof TypeError) {
            return {
                error: true,
                message: `Argument JWT sign invalid : ${error.message}`
            }
        } else if(error instanceof JWTInvalid) {
            return {
                error: true,
                message: `JWT key invalid : ${error.message}` 
            }
        }
        return {
            error: true,
            message: "Unknown error, please report to admin or customer service, time error: " + new Date().getTime()
        }
    }
}

export async function verifyToken(token: string): Promise< JWTVerifyResult<CustomJWTPayload> | TokenError> {
    try {
        const decoded: JWTVerifyResult<CustomJWTPayload> = await jwtVerify(token, publicKey, {
            algorithms: ["ES256"]
        })
        return decoded
    } catch (error) {
        if (error instanceof JWTExpired) {
            return {
                error: true,
                code: "TOKEN_EXPIRED",
                message: `JWT token expired: ${error.message}`,
            };
        }
        if (error instanceof JWSSignatureVerificationFailed) {
            return {
                error: true,
                code: "SIGNATURE_INVALID",
                message: `JWT signature invalid: ${error.message}`,
            };
        }
        if (error instanceof JOSEAlgNotAllowed) {
            return {
                error: true,
                code: "ALGORITHM_NOT_ALLOWED",
                message: `JWT algorithm not allowed: ${error.message}`,
            };
        }
        if (error instanceof JWTInvalid) {
            return {
                error: true,
                code: "TOKEN_INVALID",
                message: `JWT token invalid: ${error.message}`,
            };
        }
        if (error instanceof TypeError || error instanceof SyntaxError) {
            return {
                error: true,
                code: "TOKEN_PARSE_ERROR",
                message: `JWT could not be parsed: ${error.message}`,
            };
        }

        return {
            error: true,
            code: "UNKNOWN_ERROR",
            message:
                "Unknown JWT error: " +
                (error instanceof Error ? error.message : String(error)),
        };

    }
}