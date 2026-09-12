"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Check user approval status
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_approved")
      .eq("id", user.id)
      .single();

    if (profile && !profile.is_approved && profile.role !== "admin") {
      await supabase.auth.signOut();
      return {
        error:
          "Tài khoản của bạn đang chờ Admin phê duyệt trước khi có thể vào ứng dụng.",
      };
    }
  }

  revalidatePath("/", "layout");
  redirect("/stores");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = (formData.get("fullName") as string) || email;

  const headerList = await headers();
  const host = headerList.get("host") || "bactyn.vercel.app";
  const protocol = headerList.get("x-forwarded-proto") || "https";
  const origin = `${protocol}://${host}`;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Check user approval status
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_approved")
      .eq("id", user.id)
      .single();

    if (profile && !profile.is_approved && profile.role !== "admin") {
      await supabase.auth.signOut();
      return {
        pendingApproval: true,
        message:
          "Đăng ký tài khoản thành công! Tài khoản của bạn đang chờ Admin phê duyệt trước khi có thể sử dụng ứng dụng.",
      };
    }
  }

  revalidatePath("/", "layout");
  redirect("/stores");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
