"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabaseServer";
import { requireAdminRole } from "@/lib/authz";
import { applyTeamChanges, normalizePosition, validateTeamComposition } from "@/lib/teamChanges";

export type MakeTeamChangeResult = {
    ok: boolean;
    message: string;
};

export type TeamChangeSelection = {
    playerOutId: string;
    playerInId: string;
};

export type TeamChangePayload = {
    teamId: string;
    changes: TeamChangeSelection[];
};

function getAdminClient() {
    const serviceRoleKey =
        process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (serviceRoleKey && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
    }

    return null;
}

export async function makeTeamChange(payload: TeamChangePayload): Promise<MakeTeamChangeResult> {
    const { user } = await requireAdminRole();

    const supabase = await createClient();
    const adminClient = getAdminClient() ?? supabase;
    const { teamId, changes } = payload;

    if (!teamId) {
        return {
            ok: false,
            message: "L'équipe doit être spécifiée.",
        };
    }

    if (!Array.isArray(changes)) {
        return {
            ok: false,
            message: "Format de changements invalide.",
        };
    }

    if (changes.length > 2) {
        return {
            ok: false,
            message: "Deux changements maximum sont autorisés.",
        };
    }

    const normalizedChanges = changes.filter(
        (change) => change.playerOutId?.trim() && change.playerInId?.trim(),
    );

    if (normalizedChanges.length !== changes.length) {
        return {
            ok: false,
            message: "Chaque changement doit contenir un joueur sortant et un joueur entrant.",
        };
    }

    const outgoingIds = normalizedChanges.map((change) => change.playerOutId);
    const incomingIds = normalizedChanges.map((change) => change.playerInId);

    if (new Set(outgoingIds).size !== outgoingIds.length) {
        return {
            ok: false,
            message: "Un même joueur sortant ne peut être choisi qu'une seule fois.",
        };
    }

    if (new Set(incomingIds).size !== incomingIds.length) {
        return {
            ok: false,
            message: "Un même joueur entrant ne peut être choisi qu'une seule fois.",
        };
    }

    const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("id, user_id")
        .eq("id", teamId)
        .single();

    if (teamError || !team) {
        return {
            ok: false,
            message: "Équipe non trouvée.",
        };
    }

    if (team.user_id !== user.id) {
        return {
            ok: false,
            message: "Tu ne peux modifier que ta propre équipe.",
        };
    }

    if (normalizedChanges.length === 0) {
        const { error: deleteError } = await adminClient
            .from("team_changes")
            .delete()
            .eq("team_id", teamId);

        if (deleteError) {
            return {
                ok: false,
                message: `Impossible de supprimer les changements existants: ${deleteError.message}`,
            };
        }

        revalidatePath("/admin/changes");
        revalidatePath("/view-team");
        revalidatePath("/ranking");

        return {
            ok: true,
            message: "Aucun changement enregistre. La composition de base est conservee.",
        };
    }

    const { data: teamPlayers, error: teamPlayersError } = await supabase
        .from("team_players")
        .select("player_id, position")
        .eq("team_id", teamId)
        .eq("is_active", true);

    if (teamPlayersError || !teamPlayers) {
        return {
            ok: false,
            message: "Impossible de récupérer les joueurs de l'équipe.",
        };
    }

    const playerIds = Array.from(
        new Set([
            ...teamPlayers.map((teamPlayer) => teamPlayer.player_id),
            ...incomingIds,
        ]),
    );

    const { data: currentPlayers, error: currentPlayersError } = await supabase
        .from("players")
        .select("id, name, country_code, position")
        .in("id", playerIds);

    if (currentPlayersError || !currentPlayers) {
        return {
            ok: false,
            message: "Impossible de récupérer les informations des joueurs.",
        };
    }

    const playersById = new Map(currentPlayers.map((player) => [player.id, player]));
    const currentTeamPlayers = teamPlayers
        .map((teamPlayer) => playersById.get(teamPlayer.player_id))
        .filter((player): player is NonNullable<typeof player> => Boolean(player));

    if (currentTeamPlayers.length !== teamPlayers.length) {
        return {
            ok: false,
            message: "Certains joueurs de l'équipe sont introuvables.",
        };
    }

    for (const change of normalizedChanges) {
        const playerOut = currentTeamPlayers.find((player) => player.id === change.playerOutId);
        const playerIn = playersById.get(change.playerInId);

        if (!playerOut) {
            return {
                ok: false,
                message: "Le joueur à remplacer n'est pas dans l'équipe.",
            };
        }

        if (!playerIn) {
            return {
                ok: false,
                message: "Le joueur entrant n'existe pas.",
            };
        }

        if (currentTeamPlayers.some((player) => player.id === change.playerInId)) {
            return {
                ok: false,
                message: "Ce joueur est déjà dans l'équipe.",
            };
        }

        const outPosition = normalizePosition(playerOut.position);
        const inPosition = normalizePosition(playerIn.position);

        if (outPosition !== inPosition) {
            return {
                ok: false,
                message: "Le joueur entrant doit avoir le même poste que le joueur sortant.",
            };
        }
    }

    const nextTeamState = applyTeamChanges(
        currentTeamPlayers,
        normalizedChanges.map((change) => ({
            player_out_id: change.playerOutId,
            player_in_id: change.playerInId,
        })),
        playersById,
    );

    if (nextTeamState.effectivePlayers.length !== currentTeamPlayers.length) {
        return {
            ok: false,
            message: "Impossible de construire l'équipe après changements.",
        };
    }

    const validation = validateTeamComposition(nextTeamState.effectivePlayers);
    if (!validation.ok) {
        return validation;
    }

    const { error: deleteError } = await adminClient
        .from("team_changes")
        .delete()
        .eq("team_id", teamId);

    if (deleteError) {
        return {
            ok: false,
            message: `Impossible de remplacer les changements existants: ${deleteError.message}`,
        };
    }

    const { error: changeError } = await adminClient.from("team_changes").insert(
        normalizedChanges.map((change) => ({
            team_id: teamId,
            player_out_id: change.playerOutId,
            player_in_id: change.playerInId,
            created_at: new Date().toISOString(),
        })),
    );

    if (changeError) {
        return {
            ok: false,
            message: `Impossible d'enregistrer le changement: ${changeError.message}`,
        };
    }

    revalidatePath("/admin/changes");
    revalidatePath("/view-team");
    revalidatePath("/ranking");

    return {
        ok: true,
        message:
            normalizedChanges.length > 1
                ? "Tes deux changements ont bien été enregistrés. Ils remplacent la demande précédente."
                : "Ton changement a bien été enregistré. Il remplace la demande précédente.",
    };
}
