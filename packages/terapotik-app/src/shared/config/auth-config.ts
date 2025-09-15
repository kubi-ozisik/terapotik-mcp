import { LoginSchema } from "@/features/auth/schemas/auth-schema";
import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "../data/db";
import Auth0 from "next-auth/providers/auth0";
const baseUrl = process.env.NEXTAUTH_URL
const callbackUrl = `${baseUrl}/api/auth/callback/auth0`


// Local implementation to avoid server action import
async function getUserByEmail(email: string) {
    try {
        const user = await db.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        return user;
    } catch {
        return null;
    }
}

export const authConfig = {
    secret: process.env.AUTH_SECRET,
    session: { strategy: "jwt" },
    trustHost: true,
    providers: [
        Auth0({
            clientId: process.env.AUTH0_CLIENT_ID!,
            clientSecret: process.env.AUTH0_CLIENT_SECRET!,
            issuer: process.env.AUTH0_ISSUER!,
            authorization: {
              params: {
                scope: "openid profile email offline_access",
                audience: process.env.AUTH0_AUDIENCE || "https://api.terapotik.com",
                response_type: "code",
                redirect_uri: callbackUrl,
              },
            },
            profile(profile, tokens) {
              console.log("AUTH0 PROFILE CALLBACK - TOKEN INFO:", {
                hasAccessToken: !!tokens.access_token,
                accessTokenPrefix: tokens.access_token
                  ? tokens.access_token.substring(0, 15) + "..."
                  : "NONE",
                hasIdToken: !!tokens.id_token,
                idTokenPrefix: tokens.id_token
                  ? tokens.id_token.substring(0, 15) + "..."
                  : "NONE",
              })
      
              return {
                id: profile.sub,
                name: profile.name,
                email: profile.email,
                image: profile.picture,
              }
            },
          }),
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
        Credentials({
            async authorize(credentials: any) {
                if (!credentials || !credentials.email) return null;

                if (credentials.code) {
                    const email = credentials.email;
                    const user = await getUserByEmail(email.toLowerCase());
                    if (!user) return null;
                    return { ...user, authType: "2fa", twoFactorCode: credentials.code };
                }

                const validatedFields = LoginSchema.safeParse(credentials);
                if (validatedFields.success) {
                    const { email, password } = validatedFields.data;
                    const user = await getUserByEmail(email.toLocaleLowerCase());

                    if (!user || !user.password) return null;
                    const passwordsMatch = await bcrypt.compare(password, user.password);
                    // user is not approved by admins
                    // if (!user.isApproved) {
                    //     console.error("USER IS NOT APPROVED", user);
                    //     return null;
                    // }
                    if (passwordsMatch) return user;
                }
                return null;
            },
        }),
    ],
} satisfies NextAuthConfig;
