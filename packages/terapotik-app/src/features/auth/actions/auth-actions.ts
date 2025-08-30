"use server";

// import bcrypt from "bcryptjs";

import { db } from "@/shared/data/db";
// import { sendPasswordResetEmail, sendTwoFactorTokenEmail } from "@/features/mail/actions/mail-actions";
import { User } from "@prisma/client";

export interface IDatabaseActionResult {
    error?: { message: string } & any;
    isSuccess: boolean;
    data?: any;
}


export const getUserById = async (id: string): Promise<User | null> => {
    try {
        const user = await db.user.findUnique({ where: { id } });
        return user;
    } catch {
        return null;
    }
};



export const getUserByEmail = async (email: string) => {
    try {
        const user = await db.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        return user;
    } catch (err) {
        console.log(err);
        return null;
    }
};
