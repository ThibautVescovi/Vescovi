"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabaseServer";

type ApproveEntryResult = {
    ok: boolean;
    message: string;
};

async function approveTeamEntryInternal(teamId: string): Promise<ApproveEntryResult> {
    const supabase = await createClient();
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return {
            ok: false,
            message: "Tu dois etre connecte pour valider une equipe.",
        };
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
        return {
            ok: false,
            message: `Impossible de verifier ton role: ${profileError.message}`,
        };
    }

    if (!profile || (profile.role !== "admin" && profile.role !== "superadmin")) {
        return {
            ok: false,
            message: "Seuls les administrateurs peuvent valider une equipe.",
        };
    }

    const { error: updateError } = await supabase
        .from("entries")
        .update({ is_approved: true })
        .eq("team_id", teamId);

    if (updateError) {
        return {
            ok: false,
            message: `Impossible de valider l'equipe: ${updateError.message}`,
        };
    }

    revalidatePath("/view-team");
    revalidatePath("/ranking");

    return {
        ok: true,
        message: "Equipe validee definitivement.",
    };
}

export async function approveTeamEntry(teamId: string): Promise<void> {
    await approveTeamEntryInternal(teamId);
}


