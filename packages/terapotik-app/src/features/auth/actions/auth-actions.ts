"use server";

// import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import * as z from "zod";

import { redirectAfterLogin } from "@/shared/config/routes.config";
import { signIn } from "@/auth";
import { db } from "@/shared/data/db";
// import { sendPasswordResetEmail, sendTwoFactorTokenEmail } from "@/features/mail/actions/mail-actions";
import { User } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { LoginSchema, NewPasswordSchema, ResetSchema } from "../schemas/auth-schema";

export interface IDatabaseActionResult {
    error?: { message: string } & any;
    isSuccess: boolean;
    data?: any;
}

export const getVerificationTokenByEmail = async (email: string) => {
    try {
        const verificationToken = await db.verificationToken.findFirst({
            where: { email },
        });

        return verificationToken;
    } catch {
        return null;
    }
};

export const generateVerificationToken = async (email: string) => {
    const token = uuidv4();
    const expires = new Date(new Date().getTime() + 3600 * 1000);
    const existingToken = await getVerificationTokenByEmail(email);

    if (existingToken) {
        await db.verificationToken.delete({
            where: {
                id: existingToken.id,
            },
        });
    }
    const verficationToken = await db.verificationToken.create({
        data: {
            email,
            token,
            expires,
        },
    });
    return verficationToken;
};


export const getTwoFactorTokenByToken = async (token: string) => {
    try {
        const twoFactorToken = await db.twoFactorToken.findUnique({
            where: { token },
        });

        return twoFactorToken;
    } catch {
        return null;
    }
};

export const getTwoFactorTokenByEmail = async (email: string) => {
    try {
        const twoFactorToken = await db.twoFactorToken.findFirst({
            where: { email },
        });

        return twoFactorToken;
    } catch {
        return null;
    }
};

export const generateTwoFactorToken = async (email: string) => {
    const token = uuidv4();
    const expires = new Date(new Date().getTime() + 5 * 60 * 1000);

    const existingToken = await getTwoFactorTokenByEmail(email);

    if (existingToken) {
        await db.twoFactorToken.delete({
            where: {
                id: existingToken.id,
            },
        });
    }

    const twoFactorToken = await db.twoFactorToken.create({
        data: {
            email,
            token,
            expires,
        },
    });

    return twoFactorToken;
};

export const deleteTwoFactorConfirmation = async (id: string) => {
    try {
        await db.twoFactorConfirmation.delete({
            where: { id },
        });
    } catch { }
};

export const getUserById = async (id: string): Promise<User | null> => {
    try {
        const user = await db.user.findUnique({ where: { id } });
        return user;
    } catch {
        return null;
    }
};


export const getTwoFactorConfirmationByUserId = async (userId: string) => {
    try {
        const twoFactorConfirmation = await db.twoFactorConfirmation.findUnique({
            where: { userId },
        });

        return twoFactorConfirmation;
    } catch {
        return null;
    }
};

export const createTwoFactorConfirmation = async (id: string) => {
    try {
        await db.twoFactorConfirmation.create({
            data: {
                userId: id,
            },
        });
    } catch { }
};

export const generatePasswordResetToken = async (email: string) => {
    const token = uuidv4();
    const expires = new Date(new Date().getTime() + 3600 * 1000);

    const existingToken = await getPasswordResetTokenByEmail(email);

    if (existingToken) {
        await db.passwordResetToken.delete({
            where: { id: existingToken.id },
        });
    }
    const passwordResetToken = await db.passwordResetToken.create({
        data: {
            email,
            token,
            expires,
        },
    });

    return passwordResetToken;
};

export const getPasswordResetTokenByToken = async (token: string) => {
    try {
        const passwordResetToken = await db.passwordResetToken.findUnique({
            where: { token },
        });
        return passwordResetToken;
    } catch {
        return null;
    }
};

export const setUserPassword = async (userId: string, password: string) => {
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });
};

export const getPasswordResetTokenByEmail = async (email: string) => {
    try {
        const passwordResetToken = await db.passwordResetToken.findFirst({
            where: { email },
        });

        return passwordResetToken;
    } catch {
        return null;
    }
};

export const setUserPasswordWithToken = async (
    userId: string,
    password: string,
    tokenId: string
) => {
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });
    await db.passwordResetToken.delete({
        where: { id: tokenId },
    });
};


export const activateUserByToken = async (
    token: string
): Promise<IDatabaseActionResult> => {
    const existingToken = await getVerificationTokenByToken(token);
    if (!existingToken) {
        return { isSuccess: false, error: { message: "Token does not exist!" } };
    }

    const hasExpired = new Date(existingToken.expires) < new Date();
    if (hasExpired) {
        return { isSuccess: false, error: { message: "Token has expired!" } };
    }
    const existingUser = await getUserByEmail(existingToken.email);

    if (!existingUser) {
        return { isSuccess: false, error: { message: "Email does not exist!" } };
    }

    await db.user.update({
        where: { id: existingUser.id },
        data: {
            emailVerified: new Date(),
            email: existingToken.email,
        },
    });

    await db.verificationToken.delete({
        where: { id: existingToken.id },
    });

    return { isSuccess: true };
};

export const getVerificationTokenByToken = async function (token: string) {
    try {
        const verificationToken = await db.verificationToken.findUnique({
            where: { token },
        });

        return verificationToken;
    } catch {
        return null;
    }
};

export const linkUserEmail = async (userId: string) => {
    await db.user.update({
        where: { id: userId },
        data: { emailVerified: new Date() },
    });
};

export const verifyUserEmailById = async (id: string) => {
    await db.user.update({
        where: { id: id },
        data: { emailVerified: new Date() },
    });
};

export const getAccountByUserId = async (userId: string) => {
    try {
        const account = await db.account.findFirst({
            where: { userId },
        });

        return account;
    } catch {
        return null;
    }
};

export const sendResetPasswordToken = async (
    values: z.infer<typeof ResetSchema>
) => {
    const validatedFields = ResetSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Invalid emaiL!" };
    }

    const { email } = validatedFields.data;

    const existingUser = await getUserByEmail(email);

    if (!existingUser) {
        return { error: "Email not found!" };
    }

    const passwordResetToken = await generatePasswordResetToken(email);
    // await sendPasswordResetEmail(
    //     passwordResetToken.email,
    //     passwordResetToken.token
    // );

    return { success: "Reset email sent!" };
};
export const setNewPassword = async (
    values: z.infer<typeof NewPasswordSchema>,
    token?: string | null
) => {
    if (!token) {
        return { error: "Missing token!" };
    }

    const validatedFields = NewPasswordSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Invalid fields!" };
    }

    const { password } = validatedFields.data;

    const existingToken = await getPasswordResetTokenByToken(token);

    if (!existingToken) {
        return { error: "Invalid token!" };
    }

    const hasExpired = new Date(existingToken.expires) < new Date();

    if (hasExpired) {
        return { error: "Token has expired!" };
    }

    const existingUser = await getUserByEmail(existingToken.email);

    if (!existingUser) {
        return { error: "Email does not exist!" };
    }

    setUserPasswordWithToken(existingUser.id, password, existingToken.id);

    return { success: "Password updated!" };
};

export async function requestTwoFactorCode(email: string) {
    try {
        const existingUser = await getUserByEmail(email);

        if (!existingUser) {
            return { error: "Email not found!" };
        }

        const twoFactorToken = await generateTwoFactorToken(email);
        // await sendTwoFactorTokenEmail(twoFactorToken.email, twoFactorToken.token);

        return { success: true };
    } catch (error) {
        console.error(error);
        return { error: "Something went wrong!" };
    }
}
export async function verifyTwoFactorCode(
    email: string,
    code: string,
    callbackUrl: string = "/dashboard"
) {
    console.log("verifyTwoFactorCode called", { email, code, callbackUrl });

    try {
        const twoFactorToken = await getTwoFactorTokenByEmail(email);
        console.log("Found token:", twoFactorToken);

        if (!twoFactorToken || twoFactorToken.token !== code) {
            console.log("Invalid token match", {
                hasToken: !!twoFactorToken,
                tokenCode: twoFactorToken?.token,
                providedCode: code,
            });
            return { error: "Invalid code!" };
        }

        if (new Date(twoFactorToken.expires) < new Date()) {
            console.log("Token expired", {
                expires: twoFactorToken.expires,
                now: new Date(),
            });
            return { error: "Code expired!" };
        }

        const user = await getUserByEmail(email);
        console.log("Found user:", !!user);

        if (!user) {
            return { error: "User not found" };
        }

        console.log("Attempting signin");
        // await signIn("credentials", {
        //   email,
        //   code,
        //   redirect: true,
        //   redirectTo: callbackUrl || redirectAfterLogin,
        // });

        return { success: true };
    } catch (error) {
        console.error("verifyTwoFactorCode error:", error);
        return { error: "Something went wrong!" };
    }
}
export const login = async (
    values: z.infer<typeof LoginSchema>,
    callbackUrl?: string | null
) => {
    const validatedFields = LoginSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Invalid fields!" };
    }
    const { email, password, code } = validatedFields.data;

    const existingUser = await getUserByEmail(email);
    console.log(existingUser, email.toLocaleLowerCase());
    if (!existingUser || !existingUser.email || !existingUser.password) {
        return { error: "Email does not exist!" };
    }

    if (!existingUser.emailVerified) {
        const verificationToken = await generateVerificationToken(
            existingUser.email
        );

        // await sendVerificationEmail(
        //   existingUser?.name ?? "Friend",
        //   verificationToken.email
        // );
        console.warn("SEND THIS TOKEN VIA EMAIL", verificationToken);
        return { success: "Confirmation email sent!" };
    }

    if (existingUser.isTwoFactorEnabled && existingUser.email) {
        // todo: check password first!! or send a magic link!!!!

        if (code) {
            const twoFactorToken = await getTwoFactorTokenByEmail(existingUser.email);

            if (!twoFactorToken) {
                return { error: "Invalid code!" };
            }

            if (twoFactorToken.token !== code) {
                return { error: "Invalid code!" };
            }

            const hasExpired = new Date(twoFactorToken.expires) < new Date();

            if (hasExpired) {
                return { error: "Code expired!" };
            }

            await deleteTwoFactorConfirmation(twoFactorToken.id);

            const existingConfirmation = await getTwoFactorConfirmationByUserId(
                existingUser.id
            );

            if (existingConfirmation) {
                await deleteTwoFactorConfirmation(existingConfirmation.id);
            }

            await createTwoFactorConfirmation(existingUser.id);
        } else {
            const twoFactorToken = await generateTwoFactorToken(existingUser.email);
            // await sendTwoFactorTokenEmail(twoFactorToken.email, twoFactorToken.token);
            console.warn("SEND THIS 2FA TOKEN VIA EMAIL", twoFactorToken);

            return { twoFactor: true };
        }
    }
    try {
        const redirectPath = callbackUrl || await determineRedirectPath(existingUser.id);
        await signIn("credentials", {
            email,
            password,
            redirectTo: redirectPath,
        });
    } catch (error) {
        console.log("LOGIN ERROR", error);
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return { error: "Invalid credentials!" };
                default:
                    return { error: "Something went wrong!" };
            }
        }

        throw error;
    }
};
// export const login = async (
//   values: z.infer<typeof LoginSchema>,
//   callbackUrl?: string | null
// ) => {
//   const validatedFields = LoginSchema.safeParse(values);

//   if (!validatedFields.success) {
//     return { error: "Invalid fields!" };
//   }
//   const { email, password, code } = validatedFields.data;

//   const existingUser = await getUserByEmail(email);
//   console.log(existingUser, email.toLocaleLowerCase());
//   if (!existingUser || !existingUser.email || !existingUser.password) {
//     return { error: "Email does not exist!" };
//   }

//   if (!existingUser.emailVerified) {
//     const verificationToken = await generateVerificationToken(
//       existingUser.email
//     );

//     // await sendVerificationEmail(
//     //   existingUser?.name ?? "Friend",
//     //   verificationToken.email
//     // );
//     console.warn("SEND THIS TOKEN VIA EMAIL", verificationToken);
//     return { success: "Confirmation email sent!" };
//   }

//   if (existingUser.isTwoFactorEnabled && existingUser.email) {
//     // todo: check password first!! or send a magic link!!!!

//     if (code) {
//       const twoFactorToken = await getTwoFactorTokenByEmail(existingUser.email);

//       if (!twoFactorToken) {
//         return { error: "Invalid code!" };
//       }

//       if (twoFactorToken.token !== code) {
//         return { error: "Invalid code!" };
//       }

//       const hasExpired = new Date(twoFactorToken.expires) < new Date();

//       if (hasExpired) {
//         return { error: "Code expired!" };
//       }

//       await deleteTwoFactorConfirmation(twoFactorToken.id);

//       const existingConfirmation = await getTwoFactorConfirmationByUserId(
//         existingUser.id
//       );

//       if (existingConfirmation) {
//         await deleteTwoFactorConfirmation(existingConfirmation.id);
//       }

//       await createTwoFactorConfirmation(existingUser.id);
//     } else {
//       const twoFactorToken = await generateTwoFactorToken(existingUser.email);
//       await sendTwoFactorTokenEmail(twoFactorToken.email, twoFactorToken.token);
//       console.warn("SEND THIS 2FA TOKEN VIA EMAIL", twoFactorToken);

//       return { twoFactor: true };
//     }
//   }
//   try {
//     const redirectPath = callbackUrl || await determineRedirectPath(existingUser.id);
//     await signIn("credentials", {
//       email,
//       password,
//       redirectTo: redirectPath,
//     });
//   } catch (error) {
//     console.log("LOGIN ERROR", error);
//     if (error instanceof AuthError) {
//       switch (error.type) {
//         case "CredentialsSignin":
//           return { error: "Invalid credentials!" };
//         default:
//           return { error: "Something went wrong!" };
//       }
//     }

//     throw error;
//   }
// };
async function determineRedirectPath(userId: string) {
    const user = await db.user.findUnique({
        where: { id: userId },
        include: {
            profile: true,
            // workspaces: true,
        },
    });

    if (!user) throw new Error("User not found");

    // TODO: Add additional onboarding checks:
    // - Verify if user has required workspace objects based on preferredLayout
    // - Check if quota is initialized
    // - Verify if role-specific requirements are met
    // - Check for required integrations based on layout
    // Return to implement comprehensive checks

    if (!user.profile?.preferredLayout) {
        return "/onboarding";
    }

    // const hasWorkspace = user.workspaces.length > 0;
    // if (!hasWorkspace) {
    //     return "/onboard/workspace";
    // }

    // Rest of your existing redirect logic
    return redirectAfterLogin;
}

export const createUser = async (
    email: string,
    password: string,
    name?: string
) => {
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
        return { isSuccess: false, error: { message: "Email already in use!" } };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const data = await db.user.create({
        data: {
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
        },
    });

    return { isSuccess: true, data };
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
