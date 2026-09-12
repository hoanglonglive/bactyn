"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { UserRole, Profile } from "@/lib/types";

export async function getAllUsers() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", data: null };
  }

  // Check admin role
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (currentProfile?.role !== "admin") {
    return { error: "Only admins can manage users", data: null };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message, data: null };
  }

  return { data: data as Profile[], error: null };
}

export async function updateUserRole(targetUserId: string, newRole: UserRole) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Check admin role
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (currentProfile?.role !== "admin") {
    return { error: "Only admins can change user roles" };
  }

  // Prevent self-demotion
  if (user.id === targetUserId && newRole !== "admin") {
    return { error: "You cannot remove your own admin privileges" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", targetUserId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/stores");
  return { success: true };
}

export async function deleteUserAccount(targetUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Check admin role
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (currentProfile?.role !== "admin") {
    return { error: "Only admins can delete users" };
  }

  // Prevent deleting oneself
  if (user.id === targetUserId) {
    return { error: "You cannot delete your own account" };
  }

  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", targetUserId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/stores");
  return { success: true };
}
