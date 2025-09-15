import {
    getUserById,
} from "@/features/auth/actions/auth-actions";
import { authConfig } from "@/shared/config/auth-config";
import { PrismaAdapter } from "@auth/prisma-adapter";
// import { UserRole } from "@prisma/client";
import NextAuth from "next-auth";
import { db } from "./shared/data/db";


// const log = logger.child({ name: "auth" });

export const {
    handlers: { GET, POST },
    signIn,
    signOut,
    auth,
} = NextAuth({
    adapter: PrismaAdapter(db) as any,
    pages: {
        signIn: "/auth/login",
        error: "/auth/error",
    },
    callbacks: {
        async signIn({ user, account, credentials, email, profile }) {
            // log.debug("SIGNING IN ", user, account, credentials, email, profile);
            console.log("SIGNING IN ", user, account, credentials, email, profile);

            // Allow OAuth without email verification
            if (account?.provider !== "credentials") {
                // handle linking the accounts here
                // const session = await auth();
                // if (session?.user?.email === email) return true;
                return true;
            }

            // check email verification
            const existingUser = await getUserById(user.id ?? "");

            // Prevent sign in without email verification
            // log.debug("EMAIL VERIFIED", existingUser?.emailVerified);
            if (!existingUser?.emailVerified) return false;

            // if (existingUser.isTwoFactorEnabled) {
            //     const twoFactorConfirmation = await getTwoFactorTokenByEmail(
            //         existingUser.email!
            //     );

            //     if (!twoFactorConfirmation) return false;

            //     // Delete two factor confirmation for next sign in
            //     await deleteTwoFactorConfirmation(twoFactorConfirmation.id);
            // }
            return true;
        },
        async jwt({ token, user, account }) {
            if (user) {
                // Cast as any to bypass TypeScript errors since we've extended the types
                // in the next-auth.d.ts file but TypeScript doesn't recognize them here
                const typedUser = user as any;
                token.accessToken = account?.access_token as string;
                // token.role = typedUser.role || UserRole.USER;
                token.isTwoFactorEnabled = typedUser.isTwoFactorEnabled || false;
                token.isApproved = typedUser.isApproved || false;
                token.id = typedUser.id;
                token.name = typedUser.name || "";
                token.email = typedUser.email || "";
            }

            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                // Cast as any to bypass TypeScript errors
                const user = session.user as any;

                session.accessToken = token.accessToken as string;

                user.role = token.role;
                user.isTwoFactorEnabled = token.isTwoFactorEnabled;
                user.isApproved = token.isApproved;
                user.id = token.id;
                user.name = token.name || "";
                user.email = token.email || "";
            }

            return session;
        },
    },
    events: {
        async updateUser({ user }) {
            //   log.debug("updaring user", user);
        },
        /**
         * sent when an account in a given provider is linked to a user
         * in our user database.
         * @param param0 sent
         */
        async linkAccount({ user, account, profile }) {
            //   log.debug("LINKING", user, account, profile);
            console.log("LINKING", user, account, profile);
        },

        async createUser({ user }) {
            //   log.debug("CREATING USER", user);
            console.log("CREATING USER", user);
        },

        async signIn({ account, user }) {
            console.log("succesfully signed in log", account, user);
        },
        // // async updateUser({user}) {
        // // }
    },
    ...authConfig,
});
