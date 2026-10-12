"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { USER_COOKIE } from "@/lib/current-user";

export async function switchUser(userId: string) {
  (await cookies()).set(USER_COOKIE, userId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/", "layout");
}