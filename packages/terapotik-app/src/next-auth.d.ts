import { UserRole } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
    export type ExtendedUser = DefaultSession["user"] & {
        role: UserRole;
        isTwoFactorEnabled: boolean;
        isOAuth: boolean;
        provider?: string;
        balance: number;
        defaultCardId?: string;
        domain?: string;
        timezone?: string;
        language?: string;
        stripeConnectAccountId?: string;
        isApproved?: boolean;
    };

    interface Session {
        user: ExtendedUser;
        accessToken?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: UserRole;
        isTwoFactorEnabled: boolean;
        id: string;
        name: string;
        email: string;
        isApproved: boolean;
    }
} 