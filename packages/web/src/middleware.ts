import NextAuth from "next-auth"
import authConfig from "./config/auth.config"

// Create an extended authConfig that trusts all hosts
const extendedAuthConfig = {
  ...authConfig,
  trustHost: true,
}

export const { auth: middleware } = NextAuth(extendedAuthConfig)

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
