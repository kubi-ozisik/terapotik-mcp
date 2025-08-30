"use server";
import { auth } from "../auth";
import { db } from "./data/db";

export async function getCurrentUser() {
  const session = await auth();

  if (!session || !session.user || !session.user.id)
    throw new Error("Unauthorized");

  return session.user!;
}

export async function getUserWithProfile() {
  const user = await getCurrentUser();
  return await db.user.findUnique({
    where: { id: user.id },
    include: {
      profile: true,
    },
  });
}

export const currentUser = async () => {
  const session = await auth();

  return session?.user;
};

export const currentRole = async () => {
  const session = await auth();

  return session?.user?.role;
};
