import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";

export type AppRole = "user" | "admin" | "superadmin";

const adminRoles = new Set<AppRole>(["admin", "superadmin"]);

export async function getCurrentUserWithRole() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { user: null, role: null as AppRole | null };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    return {
        user,
        role: (profile?.role ?? "user") as AppRole,
    };
}

export async function requireAdminRole() {
    const { user, role } = await getCurrentUserWithRole();

    if (!user) {
        redirect("/login");
    }

    if (!role || !adminRoles.has(role)) {
        redirect("/home");
    }

    return {
        user,
        role,
    };
}

export function isAdminRole(role: AppRole | null | undefined) {
    return Boolean(role && adminRoles.has(role));
}


