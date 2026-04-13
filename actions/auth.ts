"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export async function register(formData: FormData) {
  const name = formData.get("name") as string | null;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email?.trim() || !password)
    throw new Error("Email and password are required");
  if (password.length < 8)
    throw new Error("Password must be at least 8 characters");

  const existing = await db.user.findUnique({ where: { email: email.trim() } });
  if (existing) throw new Error("Email already in use");

  await db.user.create({
    data: {
      name: name?.trim() || null,
      email: email.trim(),
      password: await hashPassword(password),
    },
  });

  redirect("/login");
}
