import jwt from "jsonwebtoken"

export type JwtPayload = {
  userId: number
  email: string
  role: string
}

const JWT_EXPIRES_IN = "7d"

function getJwtSecret() {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error("JWT_SECRET is missing in environment variables.")
  }

  return secret
}

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN })
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret())
    if (
      typeof decoded === "object" &&
      decoded !== null &&
      "userId" in decoded &&
      "email" in decoded &&
      "role" in decoded
    ) {
      return {
        userId: Number(decoded.userId),
        email: String(decoded.email),
        role: String(decoded.role),
      }
    }
    return null
  } catch {
    return null
  }
}
